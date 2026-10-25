import type { Metadata } from "next"

import { MoviesAdminClient } from "./movies-admin-client"

export const metadata: Metadata = {
  title: "Movie catalog review",
  robots: { index: false, follow: false },
}

export default function MoviesAdminPage() {
  return <MoviesAdminClient />
}
