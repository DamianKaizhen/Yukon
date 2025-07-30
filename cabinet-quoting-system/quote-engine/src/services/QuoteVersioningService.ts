import {
  QuoteVersion,
  QuoteChangeLog,
  ChangeType,
  QuoteCalculation,
  ValidationError,
  NotFoundError
} from '@/types';
import { Logger } from '@/utils/Logger';

interface VersionComparisonResult {
  hasChanges: boolean;
  changes: QuoteChangeLog[];
  summary: string;
}

export class QuoteVersioningService {
  private logger: Logger;
  private versions: Map<string, QuoteVersion[]> = new Map(); // In-memory storage
  private changeLogs: Map<string, QuoteChangeLog[]> = new Map();

  constructor() {
    this.logger = Logger.getInstance();
  }

  /**
   * Create new version of a quote
   */
  public async createVersion(
    quoteId: string,
    quoteData: QuoteCalculation,
    changedBy: string,
    reason?: string
  ): Promise<QuoteVersion> {
    try {
      this.logger.info('Creating quote version', { quoteId, changedBy });

      // Get existing versions
      const existingVersions = this.versions.get(quoteId) || [];
      const currentVersion = existingVersions.find(v => v.is_current);
      
      // Compare with current version if it exists
      let changes: QuoteChangeLog[] = [];
      let changesSummary = 'Initial version';
      
      if (currentVersion) {
        const comparison = await this.compareVersions(currentVersion.quote_data, quoteData);
        changes = comparison.changes;
        changesSummary = comparison.summary;
        
        // Mark current version as not current
        currentVersion.is_current = false;
      }

      // Create new version
      const newVersion: QuoteVersion = {
        id: this.generateVersionId(),
        quote_id: quoteId,
        version_number: existingVersions.length + 1,
        quote_data: this.deepClone(quoteData),
        changes_summary: changesSummary,
        created_by: changedBy,
        is_current: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      // Store version
      existingVersions.push(newVersion);
      this.versions.set(quoteId, existingVersions);

      // Store change logs
      if (changes.length > 0) {
        const existingChanges = this.changeLogs.get(quoteId) || [];
        changes.forEach(change => {
          change.quote_id = quoteId;
          change.version_from = currentVersion?.version_number || 0;
          change.version_to = newVersion.version_number;
          change.changed_by = changedBy;
          change.reason = reason;
          change.id = this.generateChangeId();
          change.created_at = new Date();
          change.updated_at = new Date();
        });
        
        existingChanges.push(...changes);
        this.changeLogs.set(quoteId, existingChanges);
      }

      this.logger.info('Quote version created successfully', {
        quoteId,
        versionNumber: newVersion.version_number,
        changesCount: changes.length
      });

      return newVersion;

    } catch (error) {
      this.logger.error('Failed to create quote version', { quoteId, error });
      throw error;
    }
  }

  /**
   * Get current version of a quote
   */
  public async getCurrentVersion(quoteId: string): Promise<QuoteVersion | null> {
    try {
      const versions = this.versions.get(quoteId) || [];
      return versions.find(v => v.is_current) || null;
    } catch (error) {
      this.logger.error('Failed to get current version', { quoteId, error });
      throw error;
    }
  }

  /**
   * Get specific version of a quote
   */
  public async getVersion(quoteId: string, versionNumber: number): Promise<QuoteVersion | null> {
    try {
      const versions = this.versions.get(quoteId) || [];
      return versions.find(v => v.version_number === versionNumber) || null;
    } catch (error) {
      this.logger.error('Failed to get version', { quoteId, versionNumber, error });
      throw error;
    }
  }

  /**
   * Get all versions of a quote
   */
  public async getAllVersions(quoteId: string): Promise<QuoteVersion[]> {
    try {
      const versions = this.versions.get(quoteId) || [];
      return versions.sort((a, b) => b.version_number - a.version_number); // Latest first
    } catch (error) {
      this.logger.error('Failed to get all versions', { quoteId, error });
      throw error;
    }
  }

  /**
   * Get version history with pagination
   */
  public async getVersionHistory(
    quoteId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{
    versions: QuoteVersion[];
    total: number;
    page: number;
    pages: number;
  }> {
    try {
      const allVersions = await this.getAllVersions(quoteId);
      const total = allVersions.length;
      const pages = Math.ceil(total / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      
      const versions = allVersions.slice(startIndex, endIndex);

      return { versions, total, page, pages };
    } catch (error) {
      this.logger.error('Failed to get version history', { quoteId, error });
      throw error;
    }
  }

  /**
   * Get change logs for a quote
   */
  public async getChangeLogs(
    quoteId: string,
    versionFrom?: number,
    versionTo?: number
  ): Promise<QuoteChangeLog[]> {
    try {
      let changes = this.changeLogs.get(quoteId) || [];

      // Filter by version range if provided
      if (versionFrom !== undefined) {
        changes = changes.filter(c => c.version_from >= versionFrom);
      }
      if (versionTo !== undefined) {
        changes = changes.filter(c => c.version_to <= versionTo);
      }

      return changes.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
    } catch (error) {
      this.logger.error('Failed to get change logs', { quoteId, error });
      throw error;
    }
  }

  /**
   * Compare two quote versions
   */
  public async compareVersions(
    oldQuote: QuoteCalculation,
    newQuote: QuoteCalculation
  ): Promise<VersionComparisonResult> {
    try {
      const changes: QuoteChangeLog[] = [];

      // Compare customer information
      if (oldQuote.customer.id !== newQuote.customer.id) {
        changes.push(this.createChangeLog(
          ChangeType.CUSTOMER_CHANGED,
          'customer_id',
          oldQuote.customer.id,
          newQuote.customer.id
        ));
      }

      // Compare line items
      const oldItems = oldQuote.line_items;
      const newItems = newQuote.line_items;

      // Check for removed items
      oldItems.forEach(oldItem => {
        const newItem = newItems.find(ni => 
          ni.product_variant.id === oldItem.product_variant.id &&
          ni.box_material.id === oldItem.box_material.id
        );
        
        if (!newItem) {
          changes.push(this.createChangeLog(
            ChangeType.ITEM_REMOVED,
            `line_${oldItem.line_number}`,
            `${oldItem.product_variant.sku} - ${oldItem.box_material.name}`,
            null
          ));
        }
      });

      // Check for added or modified items
      newItems.forEach(newItem => {
        const oldItem = oldItems.find(oi => 
          oi.product_variant.id === newItem.product_variant.id &&
          oi.box_material.id === newItem.box_material.id
        );
        
        if (!oldItem) {
          // New item added
          changes.push(this.createChangeLog(
            ChangeType.ITEM_ADDED,
            `line_${newItem.line_number}`,
            null,
            `${newItem.product_variant.sku} - ${newItem.box_material.name}`
          ));
        } else {
          // Check for modifications
          if (oldItem.quantity !== newItem.quantity) {
            changes.push(this.createChangeLog(
              ChangeType.ITEM_MODIFIED,
              `line_${newItem.line_number}_quantity`,
              oldItem.quantity,
              newItem.quantity
            ));
          }

          if (Math.abs(oldItem.unit_price - newItem.unit_price) > 0.01) {
            changes.push(this.createChangeLog(
              ChangeType.PRICE_CHANGED,
              `line_${newItem.line_number}_unit_price`,
              oldItem.unit_price,
              newItem.unit_price
            ));
          }

          if (Math.abs(oldItem.line_total - newItem.line_total) > 0.01) {
            changes.push(this.createChangeLog(
              ChangeType.PRICE_CHANGED,
              `line_${newItem.line_number}_line_total`,
              oldItem.line_total,
              newItem.line_total
            ));
          }

          // Compare discounts
          const oldDiscounts = oldItem.discount_details.reduce((sum, d) => sum + d.amount, 0);
          const newDiscounts = newItem.discount_details.reduce((sum, d) => sum + d.amount, 0);
          
          if (Math.abs(oldDiscounts - newDiscounts) > 0.01) {
            changes.push(this.createChangeLog(
              ChangeType.DISCOUNT_APPLIED,
              `line_${newItem.line_number}_discounts`,
              oldDiscounts,
              newDiscounts
            ));
          }
        }
      });

      // Compare totals
      if (Math.abs(oldQuote.subtotal - newQuote.subtotal) > 0.01) {
        changes.push(this.createChangeLog(
          ChangeType.PRICE_CHANGED,
          'subtotal',
          oldQuote.subtotal,
          newQuote.subtotal
        ));
      }

      if (Math.abs(oldQuote.total_amount - newQuote.total_amount) > 0.01) {
        changes.push(this.createChangeLog(
          ChangeType.PRICE_CHANGED,
          'total_amount',
          oldQuote.total_amount,
          newQuote.total_amount
        ));
      }

      // Compare notes
      if (oldQuote.notes !== newQuote.notes) {
        changes.push(this.createChangeLog(
          ChangeType.NOTES_UPDATED,
          'notes',
          oldQuote.notes || '',
          newQuote.notes || ''
        ));
      }

      // Generate summary
      const summary = this.generateChangesSummary(changes);

      return {
        hasChanges: changes.length > 0,
        changes,
        summary
      };

    } catch (error) {
      this.logger.error('Failed to compare versions', { error });
      throw error;
    }
  }

  /**
   * Restore a specific version
   */
  public async restoreVersion(
    quoteId: string,
    versionNumber: number,
    restoredBy: string
  ): Promise<QuoteVersion> {
    try {
      this.logger.info('Restoring quote version', { quoteId, versionNumber, restoredBy });

      const versionToRestore = await this.getVersion(quoteId, versionNumber);
      
      if (!versionToRestore) {
        throw new NotFoundError(`Version ${versionNumber} not found for quote ${quoteId}`);
      }

      // Create new version from restored data
      const newVersion = await this.createVersion(
        quoteId,
        versionToRestore.quote_data,
        restoredBy,
        `Restored from version ${versionNumber}`
      );

      this.logger.info('Quote version restored successfully', {
        quoteId,
        restoredVersion: versionNumber,
        newVersion: newVersion.version_number
      });

      return newVersion;

    } catch (error) {
      this.logger.error('Failed to restore version', { quoteId, versionNumber, error });
      throw error;
    }
  }

  /**
   * Delete a version (soft delete - mark as inactive)
   */
  public async deleteVersion(
    quoteId: string,
    versionNumber: number,
    deletedBy: string
  ): Promise<boolean> {
    try {
      const versions = this.versions.get(quoteId) || [];
      const versionToDelete = versions.find(v => v.version_number === versionNumber);
      
      if (!versionToDelete) {
        throw new NotFoundError(`Version ${versionNumber} not found for quote ${quoteId}`);
      }

      if (versionToDelete.is_current) {
        throw new ValidationError('Cannot delete the current version');
      }

      // Mark as deleted (in a real implementation, you might move to a deleted_versions table)
      versionToDelete.updated_at = new Date();
      // Add deleted flag to the version if you want to keep it for audit purposes

      this.logger.info('Quote version deleted', { quoteId, versionNumber, deletedBy });

      return true;

    } catch (error) {
      this.logger.error('Failed to delete version', { quoteId, versionNumber, error });
      throw error;
    }
  }

  /**
   * Get version statistics
   */
  public async getVersionStats(quoteId: string): Promise<{
    totalVersions: number;
    currentVersion: number;
    firstCreated: Date;
    lastModified: Date;
    totalChanges: number;
  }> {
    try {
      const versions = this.versions.get(quoteId) || [];
      const changes = this.changeLogs.get(quoteId) || [];
      const currentVersion = versions.find(v => v.is_current);

      if (versions.length === 0) {
        throw new NotFoundError(`No versions found for quote ${quoteId}`);
      }

      const sortedVersions = versions.sort((a, b) => a.created_at.getTime() - b.created_at.getTime());

      return {
        totalVersions: versions.length,
        currentVersion: currentVersion?.version_number || 0,
        firstCreated: sortedVersions[0].created_at,
        lastModified: sortedVersions[sortedVersions.length - 1].created_at,
        totalChanges: changes.length
      };

    } catch (error) {
      this.logger.error('Failed to get version stats', { quoteId, error });
      throw error;
    }
  }

  /**
   * Helper methods
   */
  private createChangeLog(
    changeType: ChangeType,
    fieldChanged: string,
    oldValue: any,
    newValue: any
  ): QuoteChangeLog {
    return {
      id: this.generateChangeId(),
      quote_id: '', // Will be set when stored
      version_from: 0, // Will be set when stored
      version_to: 0, // Will be set when stored
      change_type: changeType,
      field_changed: fieldChanged,
      old_value: oldValue,
      new_value: newValue,
      changed_by: '', // Will be set when stored
      created_at: new Date(),
      updated_at: new Date()
    };
  }

  private generateChangesSummary(changes: QuoteChangeLog[]): string {
    if (changes.length === 0) {
      return 'No changes';
    }

    const changeTypes = changes.reduce((acc, change) => {
      acc[change.change_type] = (acc[change.change_type] || 0) + 1;
      return acc;
    }, {} as Record<ChangeType, number>);

    const summaryParts: string[] = [];

    Object.entries(changeTypes).forEach(([type, count]) => {
      switch (type as ChangeType) {
        case ChangeType.ITEM_ADDED:
          summaryParts.push(`${count} item${count > 1 ? 's' : ''} added`);
          break;
        case ChangeType.ITEM_REMOVED:
          summaryParts.push(`${count} item${count > 1 ? 's' : ''} removed`);
          break;
        case ChangeType.ITEM_MODIFIED:
          summaryParts.push(`${count} item${count > 1 ? 's' : ''} modified`);
          break;
        case ChangeType.PRICE_CHANGED:
          summaryParts.push(`${count} price change${count > 1 ? 's' : ''}`);
          break;
        case ChangeType.DISCOUNT_APPLIED:
          summaryParts.push(`${count} discount change${count > 1 ? 's' : ''}`);
          break;
        case ChangeType.CUSTOMER_CHANGED:
          summaryParts.push('Customer changed');
          break;
        case ChangeType.NOTES_UPDATED:
          summaryParts.push('Notes updated');
          break;
        default:
          summaryParts.push(`${count} ${type} change${count > 1 ? 's' : ''}`);
      }
    });

    return summaryParts.join(', ');
  }

  private generateVersionId(): string {
    return `version-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }

  private generateChangeId(): string {
    return `change-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }

  private deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Export version history to JSON
   */
  public async exportVersionHistory(quoteId: string): Promise<{
    quote_id: string;
    versions: QuoteVersion[];
    changes: QuoteChangeLog[];
    exported_at: Date;
  }> {
    try {
      const versions = await this.getAllVersions(quoteId);
      const changes = await this.getChangeLogs(quoteId);

      return {
        quote_id: quoteId,
        versions,
        changes,
        exported_at: new Date()
      };

    } catch (error) {
      this.logger.error('Failed to export version history', { quoteId, error });
      throw error;
    }
  }

  /**
   * Get service statistics
   */
  public getServiceStats(): {
    totalQuotes: number;
    totalVersions: number;
    totalChanges: number;
    avgVersionsPerQuote: number;
  } {
    const totalQuotes = this.versions.size;
    const totalVersions = Array.from(this.versions.values())
      .reduce((sum, versions) => sum + versions.length, 0);
    const totalChanges = Array.from(this.changeLogs.values())
      .reduce((sum, changes) => sum + changes.length, 0);
    const avgVersionsPerQuote = totalQuotes > 0 ? totalVersions / totalQuotes : 0;

    return {
      totalQuotes,
      totalVersions,
      totalChanges,
      avgVersionsPerQuote: Math.round(avgVersionsPerQuote * 100) / 100
    };
  }
}