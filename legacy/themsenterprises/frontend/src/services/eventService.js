const eventService = {
  on(event, callback) {
    document.addEventListener(event, (e) => callback(e.detail));
  },
  emit(event, data) {
    if (event === 'show-popup') {
      console.trace('eventService.emit(\'show-popup\') called:', data);
    }
    document.dispatchEvent(new CustomEvent(event, { detail: data }));
  },
  remove(event, callback) {
    document.removeEventListener(event, callback);
  },
};

export default eventService;
