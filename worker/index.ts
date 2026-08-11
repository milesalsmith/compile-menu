import { extractMenu } from "../src/lib/extraction/pipeline";
import type { UploadedFile } from "../src/lib/extraction/pipeline";
import { menuAi } from "./ai";

/* Nothing here persists, logs or forwards the uploaded document. The PDF
   lives in this request's memory and the compiled menu goes straight back to
   the browser that sent it (rule 020-worker-api.mdc). */

function error(status: number, code: string, message: string): Response {
  return Response.json({ code, error: message }, { status });
}

async function handleExtract(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return error(405, "method_not_allowed", "Use POST to upload a menu.");
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
