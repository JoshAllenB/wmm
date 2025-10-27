/**
 * Build Update Service
 * - Listens for build update websocket events
 * - Provides manual check and toast notifications
 */
import { toast } from "../components/UI/ShadCN/hooks/use-toast";

const API_BASE = `http://${import.meta.env.VITE_IP_ADDRESS}:3001`;

class BuildUpdateService {
  constructor() {
    this.ws = null;
    this.initialized = false;
    this.clientVersion = null;
    this.serverVersion = null;
  }

  async loadClientVersion() {
    try {
      // Cache-bust to ensure we read the latest client version file
      const res = await fetch(`/version.json?_=${Date.now()}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        this.clientVersion = data.version || null;
        return data;
      }
    } catch (e) {
      // ignore
    }
    return null;
  }

  async fetchServerBuild() {
    const res = await fetch(`${API_BASE}/api/build`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Build info fetch failed: ${res.status}`);
    const data = await res.json();
    this.serverVersion = data.version || null;
    return data;
  }

  initialize(webSocketService) {
    if (this.initialized) return;
    this.ws = webSocketService;

    // Preload client version
    this.loadClientVersion();

    // Subscribe to server push notifications
    this.ws.subscribe("new-build-available", (payload) => {
      const incoming = payload?.version;
      // If same as known client version, still offer reload in case of cache
      this.notifyUpdateAvailable(incoming);
    });

    this.initialized = true;
  }

  async checkForUpdate({ silent = false } = {}) {
    try {
      const [client, server] = await Promise.all([
        this.loadClientVersion(),
        this.fetchServerBuild(),
      ]);

      if (client && server && client.version !== server.version) {
        this.notifyUpdateAvailable(server.version, { fromManualCheck: true });
        return { updateAvailable: true, client: client.version, server: server.version };
      }

      if (!silent) {
        toast({ title: "You are up to date", description: (server?.version || this.clientVersion) ? `v${server?.version || this.clientVersion}` : "" , duration: 2500 });
      }
      return { updateAvailable: false, client: client?.version, server: server?.version };
    } catch (e) {
      if (!silent) {
        toast({ title: "Update check failed", description: e.message, variant: "destructive", duration: 4000 });
      }
      return { updateAvailable: false, error: e };
    }
  }

  notifyUpdateAvailable(version, { fromManualCheck = false } = {}) {
    toast({
      title: "New version available",
      description: version ? `v${version} is ready. Reload to update.` : "A new build is ready. Reload to update.",
      duration: 8000,
      action: (
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
            onClick={() => this.forceReload(version)}
          >
            Reload now
          </button>
          {!fromManualCheck && (
            <button
              className="px-3 py-1 text-sm rounded-md border border-slate-300 hover:bg-slate-100"
              onClick={() => {/* dismiss only */}}
            >
              Later
            </button>
          )}
        </div>
      ),
    });
  }

  forceReload(version) {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("v", version || Date.now().toString());
      window.location.replace(url.toString());
    } catch (_) {
      window.location.reload();
    }
  }
}

const buildUpdateService = new BuildUpdateService();
export default buildUpdateService;
