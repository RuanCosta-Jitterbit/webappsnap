# TODO

- [ ] Add configuration to specify filename separator character currently hard-coded to underscore (`_`).
- [ ] Improve debug/logging facility
- [ ] intercept and report 'invalid username or password' dialog (util.login)
- [ ] handle net::ERR_INTERNET_DISCONNECTED (util.load)
- [ ] Find more reliable way to know when page is fully loaded, rather than using `waitFor` with fixed value for all pages (util.load)
- [ ] Compute additional container padding needed for `_full` images rather than using absolute value
- [ ] Skip util.eat if not on pmmdemo
- [ ] Consider whether `--full` option should also be specified via env var
- [ ] Rationalise and relocate directory creation code
- [ ] Check that supplied UIDs exist
- [ ] Img dir doesn't need to be arg of snap()
