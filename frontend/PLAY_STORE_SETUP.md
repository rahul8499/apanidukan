# Play Store setup

The frontend now supports one shared customer app and one seller app from the
same Vercel deployment.

## Apps

Use two Android Trusted Web Activity (TWA) wrappers:

| App | Package name | Start URL | Manifest |
| --- | --- | --- | --- |
| Customer | `com.example.apanidukan.customer` | `/` | `/manifest-customer.webmanifest` |
| Seller | `com.example.apanidukan.seller` | `/seller` | `/manifest-seller.webmanifest` |

Replace the example package names before publishing. Package names and signing
keys must be different for the two Play Store listings.

## Vercel environment variables

Set this variable on the customer web deployment:

```text
VITE_APP_ROLE=customer
VITE_CUSTOMER_PLAY_STORE_URL=https://play.google.com/store/apps/details?id=com.example.apanidukan.customer
```

Set this variable on the seller web deployment:

```text
VITE_APP_ROLE=seller
```

If both apps use one Vercel project, keep the customer values in the public
deployment and configure the seller TWA directly with `/seller` and the seller
manifest. The backend does not need a second deployment.

## Store links

Share this URL when the goal is to install the customer app and preserve the
shop:

```text
https://www.apanidukan.com/download?store=STORE_SLUG
```

The customer app uses the `store` value to open `/s/STORE_SLUG`. The normal
store URL (`/s/STORE_SLUG`) remains available for browser users.

## Android verification

After generating each signed TWA, publish its SHA-256 certificate fingerprint
at:

```text
https://www.apanidukan.com/.well-known/assetlinks.json
```

Use the exact package name and SHA-256 fingerprint from the Play App Signing
certificate. Do not use the upload certificate if Play App Signing is enabled.

Example shape:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.example.apanidukan.customer",
      "sha256_cert_fingerprints": ["REPLACE_WITH_PLAY_SHA256"]
    }
  }
]
```

Add a second object for the seller package. The file must be served as JSON,
without authentication or redirects.

## Deferred deep link limitation

The web landing page stores the shop slug and passes it as a Play install
referrer. To open that shop after a fresh Android install, the TWA wrapper must
read the Play Install Referrer and append `?store=STORE_SLUG` to its first web
launch URL. A standard TWA generated without this small native referrer bridge
will still install correctly, but it cannot restore a store link after install.