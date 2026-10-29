import { API_URL } from "../playwright.config"

// Runs once before every test run, `--no-deps` included. The suite does not start the API itself (a backend
// `webServer` entry once wiped the backend's dist/ while the API was running), so check that it is up and that it
// runs with the raised throttle limit: at the default 120 requests a minute the server-rendered pages get 429s
// and show empty lists.

const START_THE_API = "Start the API first: `THROTTLE_LIMIT=100000 pnpm start:dev` in alivia-properties-backend"

/** Below this many requests a minute the suite outruns the API's throttle. */
const MIN_THROTTLE_LIMIT = 10_000

export default async function checkTheApi() {
  let response: Response
  try {
    response = await fetch(`${API_URL}/health`, { signal: AbortSignal.timeout(15_000) })
  } catch (error) {
    const cause = (error as { cause?: { code?: string } }).cause?.code ?? (error as Error).message
    throw new Error(`${START_THE_API}\n(GET ${API_URL}/health got no answer: ${cause})`)
  }
  if (response.status !== 200) {
    throw new Error(`${START_THE_API}\n(GET ${API_URL}/health answered ${response.status})`)
  }

  const limit = Number(response.headers.get("x-ratelimit-limit"))
  if (limit > 0 && limit < MIN_THROTTLE_LIMIT) {
    throw new Error(
      `${START_THE_API}\n(The API that is running allows only ${limit} requests a minute; restart it with THROTTLE_LIMIT=100000.)`,
    )
  }
}
