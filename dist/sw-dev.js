'use strict';

var CACHE_NAME = 'sharc-cache-v1';
var path = '/shale/dist/';
var urlsToCache = [path, path + 'js/index.js', path + 'css/styles.css', path + '/RFF/modules/system/system.base.css', path + '/RFF/sites/all/themes/rff_theme/css/styles.css'];
console.log(urlsToCache);
self.addEventListener('install', function (event) {
  console.log(event);
  // Perform install steps
  event.waitUntil(caches.open(CACHE_NAME).then(function (cache) {
    console.log('Opened cache');
    return cache.addAll(urlsToCache);
  }));
});

self.addEventListener('fetch', function (event) {
  event.respondWith(caches.match(event.request).then(function (response) {
    // Cache hit - return response
    if (response) {
      console.log('cache hit ', response);
      return response;
    }
    console.log('not cached ', event.request);
    // IMPORTANT: Clone the request. A request is a stream and
    // can only be consumed once. Since we are consuming this
    // once by cache and once by the browser for fetch, we need
    // to clone the response.
    var fetchRequest = event.request.clone();

    return fetch(fetchRequest).then(function (response) {
      // Check if we received a valid response
      if (!response || response.status !== 200 && response.status !== 0) {
        // || response.type !== 'basic'
        console.log(response);
        return response;
      }
      console.log('fetched response ', response);
      // IMPORTANT: Clone the response. A response is a stream
      // and because we want the browser to consume the response
      // as well as the cache consuming the response, we need
      // to clone it so we have two streams.
      var responseToCache = response.clone();

      caches.open(CACHE_NAME).then(function (cache) {
        cache.put(event.request, responseToCache);
      });

      return response;
    });
  }));
});