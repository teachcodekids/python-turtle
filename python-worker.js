const runtimeUrl = 'https://cdn.jsdelivr.net/pyodide/v0.27.7/full/';
let runtime;
self.onmessage = async ({data: source}) => {
  try {
    if (!runtime) {
      self.postMessage({loading: true});
      importScripts(runtimeUrl + 'pyodide.js');
      const response = await fetch('turtle_browser.py');
      if (!response.ok) throw new Error('โหลดโมดูล Turtle ไม่สำเร็จ');
      const module = await response.text();
      const python = await loadPyodide({indexURL: runtimeUrl});
      python.FS.writeFile('/home/pyodide/turtle_browser.py', module);
      python.runPython('import turtle_browser');
      runtime = python;
    }
    runtime.globals.set('_studio_source', source);
    try {
      self.postMessage(JSON.parse(runtime.runPython('turtle_browser._execute(_studio_source)')));
    } finally {
      runtime.globals.delete('_studio_source');
    }
  } catch (error) {
    self.postMessage({error: String(error)});
  }
};
