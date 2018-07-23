import swURL from "file-loader?name=sw.js!babel-loader!./sw";
// HT: https://michalzalecki.com/progressive-web-apps-with-webpack/ 
/* Using file-loader to obtain swURL is a hack which allows for using Babel loader
(and any other loader) for sw.js without adding sw.js as webpack’s entry point. */ 
console.log(swURL);
const ServiceWorkerHandler = {
    init(){
        if ('serviceWorker' in navigator) {
          window.addEventListener('load', function() {
            navigator.serviceWorker.register(swURL).then(function(registration) {
              // Registration was successful
              console.log('ServiceWorker registration successful with scope: ', registration.scope, registration);
            }, function(err) {
              // registration failed :(
              console.log('ServiceWorker registration failed: ', err);
            });
          });
        } else {
            console.log('service workers not supported')

        }
    }    
};

export default ServiceWorkerHandler;