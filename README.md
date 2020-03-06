# Exterminator

Tools for the [Tilt](https://tilt.dev) exterminator rotation.

To run:

## 1) Get a clubhouse API Token

Get the token here: https://github.com/clubhouse/clubhouse-lib#how-to-get-an-api-token

Set the env variable CLUBHOUSE_API_TOKEN with the token value.

## 2) Get a github API Token

(This is technically optional, but Github has aggressive rate-limiting for anonymous requests, so adding
a token will make your setup more robust.)

Get the token here: https://help.github.com/en/github/authenticating-to-github/creating-a-personal-access-token-for-the-command-line#creating-a-token

Set the env variable GITHUB_API_TOKEN with the token value.

## 3) Install

```
npm install
npm link
```

This creates 'exterminator' as an executable on your PATH

## 4) Import!

```
exterminator sync --issue GITHUB_ISSUE_NUM
```

## License

Copyright 2020 Windmill Engineering

Licensed under [the Apache License, Version 2.0](LICENSE)


