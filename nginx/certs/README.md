# Self-signed certs for clipsphere.local

These files are NOT in version control. Generate them once per workstation:

```
bash scripts/gen-certs.sh
```

This produces `clipsphere.local.crt` and `clipsphere.local.key`. They are
mounted read-only into the `nginx` container at `/etc/nginx/certs/`.

Browsers will show a warning the first time you visit
`https://clipsphere.local` because the cert is self-signed. Either accept
the warning for the session or use `mkcert` for a friendlier alternative:

```
mkcert -install
mkcert -cert-file nginx/certs/clipsphere.local.crt \
       -key-file  nginx/certs/clipsphere.local.key \
       clipsphere.local localhost 127.0.0.1
```

`mkcert` installs a local CA that your browser already trusts, so no
warning is shown.

Don't forget the hosts entry:

```
echo "127.0.0.1 clipsphere.local" | sudo tee -a /etc/hosts
```
