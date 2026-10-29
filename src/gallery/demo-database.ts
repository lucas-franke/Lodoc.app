// The components page works on a database of its own (src/db/db.ts reads this name), so whatever is tried there never
// touches anyone's notes. main.tsx imports this first: modules run in import order, so the name is set before db.ts.
;(globalThis as { __lodocDatabase?: string }).__lodocDatabase = 'lodoc-gallery'
