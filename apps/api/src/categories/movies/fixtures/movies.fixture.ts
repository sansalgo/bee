export interface MovieFixture {
  title: string
  releaseYear: number
}

/**
 * Small local-dev/test dataset only — not real production movie data.
 * The user will supply their own dataset file for `movies:import`.
 * Deliberately includes: a franchise pair with digits ("Iron Man" /
 * "Iron Man 2"), a title with punctuation ("Spider-Man"), and a same-title
 * different-year remake pair ("The Lion King" 1994 / 2019) to exercise the
 * duplicate-policy year exception.
 */
export const movieFixtures: MovieFixture[] = [
  { title: "Iron Man", releaseYear: 2008 },
  { title: "Iron Man 2", releaseYear: 2010 },
  { title: "Spider-Man", releaseYear: 2002 },
  { title: "The Lion King", releaseYear: 1994 },
  { title: "The Lion King", releaseYear: 2019 },
  { title: "Titanic", releaseYear: 1997 },
  { title: "Frozen", releaseYear: 2013 },
  { title: "Up", releaseYear: 2009 },
  { title: "Cars", releaseYear: 2006 },
  { title: "Alien", releaseYear: 1979 },
]
