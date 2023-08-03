# Logux Website

Website generator to wrap [docs] and JSDoc into HTML template.

* Online: **[logux.org](https://logux.org/)**
* UI Kit: **[logux.org/uikit](https://logux.org/uikit/)**

Design by [Aljona Kirdina](https://twitter.com/egodyston).

[docs]: https://github.com/logux/docs

<a href="https://evilmartians.com/?utm_source=logux-docs">
  <img src="https://evilmartians.com/badges/sponsored-by-evil-martians.svg"
       alt="Sponsored by Evil Martians" width="236" height="54">
</a>


## Development

You can build local version of website and open it in browser by:

```sh
pnpm build
pnpm start
```

You need manually to re-build it on every changes.

For layout HTML and CSS development you can use UI kit with auto re-build:

```sh
pnpm start:uikit
```

To test nginx config, you will need to build and run Docker image:

```sh
pnpx ssdeploy run
```
