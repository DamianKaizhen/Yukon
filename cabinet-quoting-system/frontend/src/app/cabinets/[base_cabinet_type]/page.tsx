import { ConsolidatedCabinetDetails } from '@/components/consolidated-cabinet-details'

export default function CabinetTypePage({ 
  params 
}: { 
  params: { base_cabinet_type: string } 
}) {
  return <ConsolidatedCabinetDetails baseCabinetType={decodeURIComponent(params.base_cabinet_type)} />
}