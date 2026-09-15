import os from "node:os";
import path from "node:path";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

// Uses short-lived, in-memory Auth sessions. Never writes credentials or browser storage.
const base = process.argv[2] || "http://localhost:3100";
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, opts);
const clients = [];
let browser;
function check(value, message) { if (!value) throw new Error(message); console.log("PASS", message); }
async function login(email) {
  const listed = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (!listed.data?.users.some(u => u.email === email)) throw new Error("Existing test identity not found");
  const generated = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (generated.error) throw new Error("Cannot establish verification session");
  const jar = new Map();
  const c = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: { getAll: () => [...jar].map(([name, value]) => ({ name, value })), setAll: values => values.forEach(v => jar.set(v.name, v.value)) },
  });
  const result = await c.auth.verifyOtp({ type: "magiclink", token_hash: generated.data.properties.hashed_token });
  if (result.error) throw new Error("Verification session failed");
  clients.push(c);
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await ctx.addCookies([...jar].map(([name, value]) => ({ name, value, url: base, sameSite: "Lax" })));
  return { ctx, client: c, userId: result.data.user.id };
}
(async () => {
  browser = await chromium.launch({ headless: true });
  const master = await login("williammasum@gmail.com");
  const owner = await login("itsmbillah@gmail.com");
  const page = await master.ctx.newPage();
  await page.goto(base + "/");
  await page.waitForURL("**/admin");
  await page.getByRole("heading", { name: "Platform Overview", exact: true }).waitFor();
  check(true, "Master Admin lands on Platform Overview");
  const me = await (await master.ctx.request.get(base + "/api/auth/me")).json();
  check(me.user.isSuperAdmin && me.user.role === "platform_admin" && !me.user.activeStore.id, "Platform identity has no implicit shop");
  check((await master.ctx.request.get(base + "/api/dashboard")).status() === 403, "Retail API rejects platform mode without a shop");
  const kpis = [
    ["Total Organizations", "/admin/organizations"], ["Total Shops", "/admin/shops"],
    ["Active", "/admin/shops?status=active"], ["Suspended", "/admin/shops?status=suspended"],
    ["Total Users", "/admin/users"], ["Categories", "/admin/categories"],
  ];
  for (const [label, target] of kpis) {
    await page.goto(base + "/admin");
    await page.locator('main a[href="' + target + '"]').first().click();
    await page.waitForURL(base + target);
    check(true, "KPI drill-down: " + label);
  }
  const { data: shops, error: shopError } = await admin.from("stores").select("id, organization_id, name").order("id");
  if (shopError || !shops.length) throw new Error("Shop fixtures unavailable");
  const ownerSession = await (await owner.ctx.request.get(base + "/api/auth/me")).json();
  const ownerOrg = ownerSession.user.organizationId;
  const ownerShop = shops.find(s => s.organization_id === ownerOrg);
  const otherShop = shops.find(s => s.organization_id !== ownerOrg);
  check(!!ownerShop && !!otherShop, "Two tenant fixtures available");
  const op = await owner.ctx.newPage();
  await op.goto(base + "/admin");
  await op.waitForURL("**/dashboard");
  check(await op.getByRole("link", { name: "Sales POS", exact: true }).count() > 0, "Shop Owner retains retail navigation");
  check((await owner.ctx.request.get(base + "/api/admin/metrics")).status() === 403, "Shop Owner denied platform API");
  check((await owner.ctx.request.post(base + "/api/admin/console", { headers: { origin: base }, data: { storeId: otherShop.id } })).status() === 403, "Shop Owner cannot use support-console endpoint");
  check((await owner.ctx.request.post(base + "/api/auth/switch-store", { data: { storeId: otherShop.id } })).status() === 403, "Shop Owner cannot switch into another tenant");
  const rls = await owner.client.from("stores").select("id");
  check(!rls.error && rls.data.some(s => s.id === ownerShop.id) && !rls.data.some(s => s.id === otherShop.id), "Live stores RLS isolates the Shop Owner tenant");
  await page.goto(base + "/admin/shops/" + ownerShop.id);
  await page.getByRole("button", { name: "Open Shop Console", exact: true }).click();
  await page.waitForURL("**/dashboard");
  check(await page.getByText("Shop support console:", { exact: false }).count() > 0, "Explicit shop console shows support banner");
  const support = await (await master.ctx.request.get(base + "/api/auth/me")).json();
  check(support.user.activeStore.id === ownerShop.id && support.user.organizationId === ownerOrg, "Console uses selected shop and organization");
  await page.getByRole("button", { name: "Return to Platform", exact: true }).click();
  await page.waitForURL("**/admin");
  check(!(await (await master.ctx.request.get(base + "/api/auth/me")).json()).user.shopConsole, "Return to Platform clears shop context");
  const routes = ["/admin", "/admin/organizations", "/admin/organizations/new", "/admin/organizations/" + ownerOrg, "/admin/shops", "/admin/shops/" + ownerShop.id, "/admin/owners", "/admin/users", "/admin/payments", "/admin/categories", "/admin/settings", "/admin/support"];
  for (const width of (process.argv.includes("--smoke") ? [390, 1440] : [320, 360, 375, 390, 414, 1440])) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of routes) {
      await page.goto(base + route);
      await page.locator("main h1").waitFor();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      check(!overflow, width + "px no overflow: " + route);
    }
    if (width < 600) {
      await page.getByRole("button", { name: "Platform menu" }).click();
      const nav = page.getByRole("navigation", { name: "Platform navigation" });
      check(await nav.isVisible() && await nav.getByRole("link").count() === 9, width + "px platform mobile menu");
      check(!(await nav.innerText()).includes("Sales POS"), width + "px no retail menu in platform mode");
      await page.getByRole("button", { name: "Platform menu" }).click();
    }
    if ([390, 1440].includes(width)) {
      await page.goto(base + "/admin");
      await page.screenshot({ path: path.join(os.tmpdir(), "autopilot-platform-" + width + ".png"), fullPage: true });
    }
  }
  await page.goto(base + "/admin/payments");
  check(await page.getByRole("heading", { name: "Payment records are not configured" }).count() === 1, "Billing schema gap is visible without fake data");
  console.log("Platform browser verification completed.");
})().catch(e => { console.error("FAIL", e.message?.split("\n")[0] || "Verification failed"); process.exitCode = 1; })
.finally(async () => { for (const c of clients) await c.auth.signOut({ scope: "local" }); if (browser) await browser.close(); });
