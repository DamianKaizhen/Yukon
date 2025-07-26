# SSL Certificate Directory

This directory is for SSL certificates for HTTPS configuration.

## Development

For development, you can generate self-signed certificates:

```bash
# Generate self-signed certificate for development
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes \
  -subj "/C=CA/ST=ON/L=Toronto/O=Yudezign/CN=localhost"
```

## Production

For production, obtain certificates from:
- Let's Encrypt (recommended, free)
- Your certificate authority
- Cloud provider SSL certificates

Place your certificates as:
- `cert.pem` - SSL certificate
- `key.pem` - Private key

## Security Notes

- Never commit real SSL certificates to version control
- Use proper file permissions (600 for private keys)
- Rotate certificates before expiration
- Use strong encryption algorithms (RSA 4096+ or ECDSA)