// A permissive stand-in for @minecraft/server(-ui): every property is a
// callable proxy, and `.subscribe(cb)` calls are recorded so tests can see
// which events the add-on wires up.
export const subscriptions: { path: string; callback: unknown }[] = [];
/** Every API function called or constructed (paths like "server.system.run"). */
export const calls: string[] = [];

function deep(path: string): unknown {
  const fn = function () {
    calls.push(path);
    return deep(`${path}()`);
  };
  return new Proxy(fn, {
    get(_t, prop) {
      if (prop === "then") return undefined;
      if (prop === Symbol.toPrimitive) return () => path;
      if (prop === "subscribe") {
        return (callback: unknown) => {
          subscriptions.push({ path, callback });
          return callback;
        };
      }
      if (prop === "currentTick") return 0;
      return deep(`${path}.${String(prop)}`);
    },
    apply() {
      calls.push(path);
      return deep(`${path}()`);
    },
    construct() {
      calls.push(`new ${path}`);
      return deep(`new ${path}`) as object;
    },
  });
}

export function mockModule(name: string): Record<string, unknown> {
  return new Proxy({} as Record<string, unknown>, {
    get(_t, prop) {
      if (prop === "__esModule") return true;
      if (prop === "then") return undefined;
      return deep(`${name}.${String(prop)}`);
    },
    has() {
      return true;
    },
  });
}
