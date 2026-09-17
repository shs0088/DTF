import { redirect } from "react-router";
import type { Route } from "./+types/home";

const V48_URL = "/DTF_Studio_V48.22E_VIEW_ALL_SYNCED.html";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const target = new URL(V48_URL, url.origin);
  target.hash = url.hash;
  return redirect(target.pathname + target.search + target.hash);
}

export default function Home() {
  return null;
}
