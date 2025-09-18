(function(){
  const path = location.pathname;
  const ok = {
    "/t1": true,
    "/t2": !!localStorage.getItem("jsd:done:t1"),
    "/t3": !!localStorage.getItem("jsd:done:t2"),
    "/t4": !!localStorage.getItem("jsd:done:t3"),
    "/results": !!localStorage.getItem("jsd:done:t4") || localStorage.getItem("jsd:skip:t4")==="1",
  }[path];
  if (ok === false) {
    const back = path==="/t2"?"/t1": path==="/t3"?"/t2": path==="/t4"?"/t3": "/t1";
    location.replace(back);
  }
})();