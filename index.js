"use strict";

const merge = (...args) => Object.assign({}, ...args);

const ead = {
  SYM_IMPL: Symbol("ead.SYM_IMPL"),
  SYM_DEF:  Symbol("ead.SYM_DEF"),

  execute: (tasks, request, onEvent = null) => {
    throw new Error("TODO");
  },

  createTask: (name, def) => {
    if (typeof(def) === "function") {
      return ead.createTask(name, { impl: def });
    }
    if (typeof(def.interfaceName) !== "string") {
      return ead.createTask(name, merge(def, {
        interfaceName: `taskInterface_${ name }`,
      }));
    }
    if (typeof(def.argsLength) !== "number") {
      return ead.createTask(name, merge(def, {
        argsLength: def.impl.length,
      }));
    }

    if (!/^[$A-Za-z_][0-9A-Za-z_$]*$/.test(name)) {
      throw new InvalidNameError(name);
    }

    const retval = (...args) => ({ request: name, args });

    Object.defineProperties(retval, {
      name:           { value: def.interfaceName },
      length:         { value: def.argsLength    },
      [ead.SYM_IMPL]: { value: def.impl          },
      [ead.SYM_DEF]:  { value: def               },
    });

    return retval;
  },

  createTasks: (defs) => Object.keys(defs).reduce(
    (acc, name) => merge(acc, {
      [name]: ead.createTask(name, defs[name]),
    }),

    {}
  ),

  replaceTaskImpls: (tasks, defs) => Object.keys(defs).reduce(
    (acc, name) => {
      if (typeof(tasks[name]) === "undefined") {
        throw new InvalidTaskNameError(name);
      }

      const implCreator = defs[name];

      const previousTaskDef = tasks[name][ead.SYM_DEF];
      const newTaskDef      = merge(previousTaskDef, {
        impl: implCreator(previousTaskDef.impl),
      });

      return merge(acc, {
        [name]: ead.createTask(name, newTaskDef),
      });
    },

    {}
  ),

  defaultValue: function* (request, defaultValue) {
    try {
      const result = yield request;
      if (typeof(result) !== "undefined") {
        return result;
      } else {
        return defaultValue;
      }
    } catch (_error) {
      return defaultValue;
    }
  },

  tasks: ead.createTasks({
    Date: {
      now: () => ({ response: Date.now() }),
    },

    Math: {
      random: () => ({ response: Math.random() }),
    },

    clearTimeout: (id) => ({ response: clearTimeout(id) }),
    setTimeout: (fn, ms) => ({ response: setTimeout(fn, ms) }),
  }),
};

const tasks = ead.createTasks({
  http: {
    get: (url) => fetch(url)
      .then(res  => res.json())
      .then(json => ({ response: json }))
    ,
  },
});

const getPerson = function* (id) {
  const person = yield tasks.http.get(`https://swapi.co/api/people/${ id }`);
  return person.name;
};

const getPeopleWithSameName = function* (id) {
  const person = yield tasks.http.get(`https://swapi.co/api/people/${ id }`);
  const sameNames = yield tasks.db.query({
    text: `
      SELECT *
      FROM users
      WHERE name = $1
    `,
    values: [person.name],
  });

  const randomNumber = yield ead.tasks.math.random();

  return sameNames;
};

ead.execute(tasks, getPerson)
.then(names => {
  console.log("\n");
  console.log("Function Results:");
  console.log(names.join(", "));
})
.catch(console.error);
