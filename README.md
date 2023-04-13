My environment (probably not required, but untested outside of this setup):

- CentOS 7.9
- Node JS 14.17.0
- NPM 8.19.1
- SQLite3 3.36.0

Steps to set up:

- Download the initial copy of fftbg.db to this directory
- Run `npm install`
- Run `node fftbg` to update fftbg.db with any new data from fftbg.com
- Run `sqlite3 fftbg.db` to get an interactive SQL shell for ad-hoc queries
