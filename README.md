My environment (probably not required, but untested outside of this setup):

- CentOS 7.9
- Node JS 14.17.0
- NPM 8.19.1
- SQLite3 3.36.0

Steps to set up:

- Download the initial copy of fftbg.db to this directory
- Run `npm install` to pull in 3rd party dependencies
- Run `node fftbg` to update fftbg.db with any new data from fftbg.com
- Run `sqlite3 fftbg.db` to get an interactive SQL shell for ad-hoc queries
- Run `node mark-memes` to generate a list of meme tournaments (also generates\
output seen in https://atsymboldot.com/f2/memes.txt)

The file `examples.sql` contains sample queries to demonstrate usage of the data.

Scripts in the `auto` directory are the ones used to generate the outputs \
that can be seen on https://atsymboldot.com/f2/auto/ - invoke them like this: \
`sqlite3 -list fftbg.db .read\ auto/most-champs.sql`
