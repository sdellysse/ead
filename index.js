"use strict";

const m = (def) => {
  const mModule = {
    exports: {},
  };

  def(mModule);

  return mModule.exports;
};

const task = m((module) => {
  const ead = require("ead");

  module.exports = ead.tasks.createAll({
    http: {
      get: (url) => fetch(url)
        .then(res  => res.json())
        .then(json => ({ response: json }))
      ,
    },
  });
});
