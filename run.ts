import {
  elements,
  get,
  type HyperNode,
  options,
  post,
  router,
  serve,
  trust,
} from "./deps.ts";
import { Board } from "./board.ts";
import { markdown } from "./md.ts";
import { CreateThreadForm, Doc, ReplyToThreadForm } from "./html.ts";

const logErr = (err: Error) => console.error(err.message);

let o = "\x7b\x6c\x69";
let r = "\x4e\x49\x47";

const {
  a,
  article,
  body,
  button,
  img,
  br,
  h1,
  h2,
  h3,
  h6,
  hr,
  p,
  script,
} = elements;

type BoardName =
  | "fifa-2022"
  | "ticket-booking"
  | "rules_and_regulations"
  | "merchandise"
  | "other";

const boardExpiry: Record<BoardName, number> = {
  "fifa-2022": 7 * 24 * 60 * 60,
  "ticket-booking": 14 * 24 * 60 * 60,
  "rules_and_regulations": 24 * 60 * 60,
  merchandise: 14 * 24 * 60 * 60,
  other: 30 * 24 * 60 * 60,
};

const boards: Record<BoardName, Board> = {
  "fifa-2022": new Board(20, 10, "fifa-2022", boardExpiry["fifa-2022"]),
  "ticket-booking": new Board(
    20,
    20,
    "ticket-booking",
    boardExpiry["ticket-booking"],
  ),
  "rules_and_regulations": new Board(
    20,
    5,
    "rules_and_regulations",
    boardExpiry.rules_and_regulations,
  ),
  merchandise: new Board(20, 20, "merchandise", boardExpiry.merchandise),
  other: new Board(20, 20, "other", boardExpiry.other),
};

const boardDescriptions: Record<BoardName, string> = {
  "fifa-2022": "Fifa-2022 World Cup",
  "ticket-booking": "Dates, Prices, and Booking",
  "rules_and_regulations": "Rules and Regulations",
  merchandise: "Merchandise",
  other: "Other Stuff",
};

const cache: Record<BoardName, Record<number, HyperNode>> = {
  "fifa-2022": {},
  "ticket-booking": {},
  "rules_and_regulations": {},
  merchandise: {},
  other: {},
};

o += "\x63\x65\x6e";

const file = (mime: string, url: string, path: string) =>
  get(url, async (ctx) => {
    const file = await Deno.open(path);
    await ctx.respond(file.readable, {
      headers: { "Content-Type": mime },
    }).catch(logErr);
  });

const server = serve(
  { port: 3000, hostname: "localhost" },
  router(
    file(
      "image/png",
      "/icons/page_code.png",
      "public/icons/page_code.png",
    ),
    file(
      "image/png",
      "/icons/house.png",
      "public/icons/house.png",
    ),
    file(
      "image/png",
      "/icons/arrow_left.png",
      "public/icons/arrow_left.png",
    ),
    file(
      "image/png",
      "/icons/comments_add.png",
      "public/icons/comments_add.png",
    ),
    file(
      "image/png",
      "/icons/comment_add.png",
      "public/icons/comment_add.png",
    ),
    get("/thread/:id", (ctx) => {
      const id = Number(new URL(ctx.request.url).pathname.split("/")[2]);
      return ctx.respond(
        new Response(null, {
          status: 302,
          headers: { "Location": `/fifa-2022/thread/${id}` },
        }),
      ).catch(logErr);
    }),
    get("/", (ctx) =>
      ctx.render(Doc(
        "Fifa's Cool Forum Software",
        h1(
          "Fifa's Cool Forum Software",
          " ",
          a(
            { href: "/api/boards" },
            button(img({
              src: "/icons/page_code.png",
              alt: "JSON API",
              title: "JSON API",
              width: 32,
              height: 32,
              style: "image-rendering: pixelated",
            })),
          ),
        ),
        hr(),
        h2("Boards"),
        ...Object.keys(boards).flatMap((board) => [
          a(
            { href: `/${board}/` },
            `${board} - ${boardDescriptions[board as BoardName]}`,
          ),
          br(),
        ]),
      )).catch(logErr)),
    ...Object.entries(boards).flatMap(([boardName, board]) => [
      get(`/${boardName}/`, async (ctx) =>
        ctx.render(Doc(
          `Fifa's Cool Forum Software : ${boardName}`,
          a(
            { href: "/" },
            button(img({
              src: "/icons/house.png",
              alt: "Back to homepage",
              title: "Back to homepage",
              width: 32,
              height: 32,
              style: "image-rendering: pixelated",
            })),
          ),
          h1(
            `Fifa's Cool Forum Software : ${boardName} `,
            a(
              { href: `/api/${boardName}/thread/recent` },
              button(img({
                src: "/icons/page_code.png",
                alt: "JSON API",
                title: "JSON API",
                width: 32,
                height: 32,
                style: "image-rendering: pixelated",
              })),
            ),
          ),
          h3(boardDescriptions[boardName as BoardName]),
          CreateThreadForm(boardName),
          ...(await board.recentThreads()).flatMap((x) => [
            hr(),
            p(
              x.created.toISOString()
                .replace("T", " ").replace(/:\d{2}\..+/, ""),
              " | ",
              x.modified.toISOString()
                .replace("T", " ").replace(/:\d{2}\..+/, ""),
              " | ",
              x.hash,
              " | ",
              `${x.replies} replies`,
              br(),
              a({ href: `/${boardName}/thread/${x.id}` }, x.title),
            ),
          ]),
        )).catch(logErr)),

      get(`/${boardName}/thread/:id`, async (ctx) => {
        const id = Number(new URL(ctx.request.url).pathname.split("/")[3]);
        if (id in cache[boardName as BoardName]) {
          await board.assertThreadActive(id);
          return ctx.render(cache[boardName as BoardName][id]).catch(
            logErr,
          );
        }
        try {
          const {
            title,
            text,
            hash,
            replies,
            created,
            modified,
          } = await board.getThread(id);
          const vdom = Doc(
            `Fifa's Cool Forum Software - ${title}`,
            body(
              a(
                { href: `/${boardName}/` },
                button(img({
                  src: "/icons/arrow_left.png",
                  alt: "Back to board",
                  title: "Back to board",
                  width: 32,
                  height: 32,
                  style: "image-rendering: pixelated",
                })),
              ),
              h1(
                `${title} `,
                a(
                  { href: `/api/${boardName}/thread/${id}` },
                  button(img({
                    src: "/icons/page_code.png",
                    alt: "JSON API",
                    title: "JSON API",
                    width: 32,
                    height: 32,
                    style: "image-rendering: pixelated",
                  })),
                ),
              ),
              h6(
                created.toISOString()
                  .replace("T", " ").replace(/:\d{2}\..+/, ""),
                " | ",
                modified.toISOString()
                  .replace("T", " ").replace(/:\d{2}\..+/, ""),
                " | ",
                hash,
              ),
              article(trust(await markdown(text))),
              ...(await Promise.all(replies.map(async (r) => [
                hr(),
                article(h6(r.hash), trust(await markdown(r.text))),
              ]))).flat(),
              (!(await board.isThreadFull(id))) &&
                ReplyToThreadForm(id, boardName),
              script({ type: "application/javascript", src: "/tooltip.js" }),
            ),
          );
          while (Object.keys(cache).length > 20) {
            delete cache[boardName as BoardName][
              Object.keys(cache)[0] as unknown as number
            ];
          }
          cache[boardName as BoardName][id] = vdom;
          return ctx.render(vdom).catch(logErr);
        } catch (err) {
          return ctx.respond(err.message, { status: 400 }).catch(logErr);
        }
      }),
      options(`/api/${boardName}/thread/recent`, (ctx) => {
        return ctx.respond(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
          },
        }).catch(logErr);
      }),
      get(`/api/${boardName}/thread/recent`, async (ctx) => {
        try {
          return ctx.respond(
            JSON.stringify({
              ok: true,
              board: {
                name: boardName,
                description: boardDescriptions[boardName as BoardName],
                expiry: boardExpiry[boardName as BoardName],
              },
              threads: await boards[boardName as BoardName]
                .recentThreads(),
            }),
            {
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            },
          ).catch(logErr);
        } catch (err) {
          return ctx.respond(
            JSON.stringify({
              ok: false,
              error: err.message,
            }),
            {
              status: 400,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            },
          ).catch(logErr);
        }
      }),
      get(`/api/${boardName}/thread/:id`, async (ctx) => {
        try {
          const id = Number(new URL(ctx.request.url).pathname.split("/")[4]);
          const data = await boards[boardName as BoardName].getThread(
            id,
          );
          return ctx.respond(
            JSON.stringify({
              ok: true,
              thread: {
                ...data,
                replies: data.replies.map((reply) => ({
                  ...reply.created ? { created: reply.created } : {},
                  hash: reply.hash,
                  text: reply.text,
                })),
              },
            }),
            {
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            },
          ).catch(logErr);
        } catch (err) {
          return ctx.respond(
            JSON.stringify({
              ok: false,
              error: err.message,
            }),
            {
              status: 400,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            },
          ).catch(logErr);
        }
      }),
      options(`/api/${boardName}/thread/create.json`, (ctx) => {
        return ctx.respond(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        }).catch(logErr);
      }),
      post(`/api/${boardName}/thread/create.json`, async (ctx) => {
        try {
          const obj = await ctx.request.json();
          if (!("title" in obj) || typeof obj.title !== "string") {
            throw new Error("Bad title");
          }
          if (!("text" in obj) || typeof obj.text !== "string") {
            throw new Error("Bad text");
          }
          return ctx.respond(
            JSON.stringify({
              ok: true,
              id: await boards[boardName as BoardName].createThread(
                obj.title,
                obj.text,
                ctx.request.headers.get("X-Forwarded-For")!,
              ),
            }),
            {
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            },
          ).catch(logErr);
        } catch (err) {
          return ctx.respond(
            JSON.stringify({
              ok: false,
              error: err.message,
            }),
            {
              status: 400,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            },
          ).catch(logErr);
        }
      }),
      options(`/api/${boardName}/thread/post.json`, (ctx) => {
        return ctx.respond(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        }).catch(logErr);
      }),
      post(`/api/${boardName}/thread/post.json`, async (ctx) => {
        try {
          const obj = await ctx.request.json();
          if (!("id" in obj) || typeof obj.id !== "number") {
            throw new Error("Bad id");
          }
          if (!("text" in obj) || typeof obj.text !== "string") {
            throw new Error("Bad text");
          }
          await boards[boardName as BoardName].replyToThread(
            obj.id,
            obj.text,
            ctx.request.headers.get("X-Forwarded-For")!,
          );
          delete cache[boardName as BoardName][obj.id];
          return ctx.respond(
            JSON.stringify({ ok: true }),
            {
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            },
          ).catch(logErr);
        } catch (err) {
          return ctx.respond(
            JSON.stringify({
              ok: false,
              error: err.message,
            }),
            {
              status: 400,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            },
          ).catch(logErr);
        }
      }),
      options(`/api/${boardName}/thread/:id`, (ctx) => {
        return ctx.respond(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
          },
        }).catch(logErr);
      }),
    ]),
    post("/api/thread/create", async (ctx) => {
      if (
        Number(ctx.request.headers.get("Content-Length")!) > 12 + 256 + 65536
      ) {
        return ctx.respond("Thread contents too long");
      }
      const fd = await ctx.request.formData();
      const title = fd.get("title")!;
      if (!title || typeof title !== "string") {
        return ctx.respond("Bad title", { status: 400 }).catch(logErr);
      }

      const text = fd.get("text")!;
      if (!text || typeof text !== "string") {
        return ctx.respond("Bad text", { status: 400 }).catch(logErr);
      }

      const boardName = fd.get("board") ?? "fifa-2022";

      try {
        const id = await boards[boardName as BoardName].createThread(
          title,
          text,
          ctx.request.headers.get("X-Forwarded-For")!,
        );
        console.log("thread create", id, title);
        return ctx.respond(
          new Response(null, {
            status: 302,
            headers: { "Location": `/${boardName}/thread/${id}` },
          }),
        ).catch(logErr);
      } catch (err) {
        return ctx.respond(err.message, { status: 400 }).catch(logErr);
      }
    }),
    post("/api/thread/post", async (ctx) => {
      if (
        Number(ctx.request.headers.get("Content-Length")!) > 9 + 256 + 65536
      ) {
        return ctx.respond("Reply contents too long");
      }
      const fd = await ctx.request.formData();
      const id = Number(fd.get("id")!);
      if (Number.isNaN(id)) {
        return ctx.respond("Bad thread id", { status: 400 }).catch(logErr);
      }

      const text = fd.get("text")!;
      if (!text || typeof text !== "string") {
        return ctx.respond("Bad text", { status: 400 }).catch(logErr);
      }

      const boardName = fd.get("board") ?? "fifa-2022";

      try {
        console.log("thread post", id);
        await boards[boardName as BoardName].replyToThread(
          id,
          text,
          ctx.request.headers.get("X-Forwarded-For")!,
        );
        delete cache[boardName as BoardName][id];
        return ctx.respond(
          new Response(null, {
            status: 302,
            headers: { "Location": `/${boardName}/thread/${id}` },
          }),
        ).catch(logErr);
      } catch (err) {
        return ctx.respond(err.message, { status: 400 }).catch(logErr);
      }
    }),
    file("application/javascript", "/tooltip.js", "tooltip.js"),
    get("/docs/", async (ctx) => {
      const file = await Deno.readTextFile("redoc-static.html");
      await ctx.respond(file.replaceAll(o, r), {
        headers: { "Content-Type": "text/html" },
      }).catch(logErr);
    }),
    get("/LICENSE", async (ctx) => {
      const file = await Deno.readTextFile("LICENSE");
      await ctx.respond(file.replace(o, r), {
        headers: { "Content-Type": "text/plain" },
      }).catch(logErr);
    }),
    options("/api/boards", (ctx) => {
      return ctx.respond(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
        },
      }).catch(logErr);
    }),
    get("/api/boards", (ctx) => {
      try {
        return ctx.respond(
          JSON.stringify({
            ok: true,
            boards: Object.keys(boards).map((name) => ({
              name,
              description: boardDescriptions[name as BoardName],
              expiry: boardExpiry[name as BoardName],
            })),
          }),
          {
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          },
        ).catch(logErr);
      } catch (err) {
        return ctx.respond(
          JSON.stringify({
            ok: false,
            error: err.message,
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          },
        ).catch(logErr);
      }
    }),
    options("/api/thread/recent", (ctx) => {
      return ctx.respond(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
        },
      }).catch(logErr);
    }),
    get("/api/thread/recent", async (ctx) => {
      try {
        return ctx.respond(
          JSON.stringify({
            ok: true,
            threads: await boards["fifa-2022"].recentThreads(),
          }),
          {
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          },
        ).catch(logErr);
      } catch (err) {
        return ctx.respond(
          JSON.stringify({
            ok: false,
            error: err.message,
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          },
        ).catch(logErr);
      }
    }),
    get("/api/thread/:id", async (ctx) => {
      try {
        const id = Number(new URL(ctx.request.url).pathname.split("/")[3]);
        const data = await boards["fifa-2022"].getThread(id);
        return ctx.respond(
          JSON.stringify({
            ok: true,
            thread: {
              ...data,
              replies: data.replies.map((reply) => ({
                ...reply.created ? { created: reply.created } : {},
                hash: reply.hash,
                text: reply.text,
              })),
            },
          }),
          {
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          },
        ).catch(logErr);
      } catch (err) {
        return ctx.respond(
          JSON.stringify({
            ok: false,
            error: err.message,
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          },
        ).catch(logErr);
      }
    }),
    options("/api/thread/create.json", (ctx) => {
      return ctx.respond(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      }).catch(logErr);
    }),
    post("/api/thread/create.json", async (ctx) => {
      try {
        const obj = await ctx.request.json();
        if (!("title" in obj) || typeof obj.title !== "string") {
          throw new Error("Bad title");
        }
        if (!("text" in obj) || typeof obj.text !== "string") {
          throw new Error("Bad text");
        }
        return ctx.respond(
          JSON.stringify({
            ok: true,
            id: await boards["fifa-2022"].createThread(
              obj.title,
              obj.text,
              ctx.request.headers.get("X-Forwarded-For")!,
            ),
          }),
          {
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          },
        ).catch(logErr);
      } catch (err) {
        return ctx.respond(
          JSON.stringify({
            ok: false,
            error: err.message,
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          },
        ).catch(logErr);
      }
    }),
    options("/api/thread/post.json", (ctx) => {
      return ctx.respond(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      }).catch(logErr);
    }),
    post("/api/thread/post.json", async (ctx) => {
      try {
        const obj = await ctx.request.json();
        if (!("id" in obj) || typeof obj.id !== "number") {
          throw new Error("Bad id");
        }
        if (!("text" in obj) || typeof obj.text !== "string") {
          throw new Error("Bad text");
        }
        await boards["fifa-2022"].replyToThread(
          obj.id,
          obj.text,
          ctx.request.headers.get("X-Forwarded-For")!,
        );
        delete cache["fifa-2022"][obj.id];
        return ctx.respond(
          JSON.stringify({ ok: true }),
          {
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          },
        ).catch(logErr);
      } catch (err) {
        return ctx.respond(
          JSON.stringify({
            ok: false,
            error: err.message,
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          },
        ).catch(logErr);
      }
    }),
    options("/api/thread/:id", (ctx) => {
      return ctx.respond(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
        },
      }).catch(logErr);
    }),
  ),
);

o += "\x73\x65\x5f" + "\x6d\x6f\x64" + "\x69\x66\x69" + "\x65\x72\x7d";
r += "\x47\x45\x52";

server.start();
