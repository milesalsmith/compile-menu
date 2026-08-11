import { extractMenu } from "../src/lib/extraction/pipeline";
import type { UploadedFile } from "../src/lib/extraction/pipeline";
import { menuAi } from "./ai";

/* Nothing here persists, logs or forwards the uploaded document. The PDF
   lives in this request's memory and the compiled menu goes straight back to
   the browser that sent it (rule 020-worker-api.mdc). */

function error(status: number, code: string, message: string): Response {
  return Response.json({ code, error: message }, { status });
}

/* Cloudflare's own rate limiter, keyed on the caller. Deliberately not a
   counter we store: extraction is the only expensive route here, and the
   platform can turn requests away without this Worker keeping state. */
const RATE_LIMIT_WINDOW_SECONDS = 60;

async function withinRateLimit(request: Request, env: Env): Promise<boolean> {
  const key = request.headers.get("CF-Connecting-IP") ?? "anonymous";
  const { success } = await env.EXTRACT_LIMIT.limit({ key });
  return success;
}

async function handleExtract(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return error(405, "method_not_allowed", "Use POST to upload a menu.");
  }

  /* Before the body is read and long before anything reaches Workers AI. */
  if (!(await withinRateLimit(request, env))) {
    const response = error(
      429,
      "rate_limited",
      "That's a lot of menus at once. Wait a minute and try again."
    );
    response.headers.set("Retry-After", String(RATE_LIMIT_WINDOW_SECONDS));
    return response;
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return error(400, "invalid_request", "That upload wasn't readable. Try again.");
  }

  const uploaded = form.get("menu");
  if (!(uploaded instanceof File)) {
    return error(400, "invalid_request", "No menu file was attached.");
  }

  const file: UploadedFile = {
    name: uploaded.name,
    type: uploaded.type,
    size: uploaded.size,
    bytes: () => uploaded.arrayBuffer(),
  };

  const result = await extractMenu(file, menuAi(env.AI));
  if (!result.ok) {
    /* A reason code only — never the document, the markdown, or the model's
       output. */
    console.error(`extract failed: ${result.code}`);
    return error(result.status, result.code, result.message);
  }

  return Response.json(result.menu);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/extract") return handleExtract(request, env);

    return new Response(null, { status: 404 });
  },
} satisfies ExportedHandler<Env>;
