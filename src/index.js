import './css/main.scss';
import '../helpers/string-helpers';
import tippy from 'tippy.js';
import { createBrowseCategory, createTopicKey } from './components/BrowseButtons';
import { createResultsContainer, createResultItem, filterResults } from './components/ResultItems'; 
import smoothscroll from 'smoothscroll-polyfill';
import searchHTML from 'html-loader!./components/form.html';
import loadingPage from 'html-loader!./components/loading-page.html';
import sharkImageUrl from './assets/shark-animate-sheared.svg';
import { arrayFind } from './polyfills.js';
import { NodeListForEach } from './polyfills.js';

   
(function(){     
/* global d3 */
"use strict";  
    const groupId = '2127948'; // id of the Zotero group
    const tooltipKey = '1kK8LHgzaSt0zC1J8j3THq8Hgu_kEF-TGLry_U-6u9WA'; // id of the Google Sheets tooltip dictionary
    var controller = { 
        gateCheck: 0, 
        searchType: 'fields',
        init(useLocal){ // pass in true to bypass API and use local data

            //SWHandler.init();
            this.polyfills();
            this.showLoadingPage();
            window.RFFApp.model.topicButtonPromise = new Promise((resolve) => {
                window.RFFApp.model.resolveTopicButtons = resolve;
            });

            this.getZoteroCollections(useLocal);
            this.getZoteroItems(useLocal);
            this.returnCollectionTooltipTitles();
            
        },
        polyfills(){
            arrayFind();
            NodeListForEach();
        },
        showLoadingPage(){
            console.log(sharkImageUrl);
            document.querySelector('#app-container').insertAdjacentHTML('afterbegin', loadingPage);
            var shark = document.querySelector('#shark-image');
            shark.setAttribute('src',sharkImageUrl.replace(/"/g,''));
            setInterval(() => {
                shark.classList.add('swimUp');
                setTimeout(() => {
                    shark.classList.add('swimDown');
                    setTimeout(() => {
                        shark.classList.remove('swimUp');
                        shark.classList.remove('swimDown');
                    }, 200);
                },200);
            },3000);
        },
        returnCollectionTooltipTitles(){ // gets data from Google Sheet, converst rows to key-value pairs, nests the data
                              // as specified by the config object, and creates array of summarized data at different
                              // nesting levels                                
            d3.json('https://sheets.googleapis.com/v4/spreadsheets/' + tooltipKey + '/values/Sheet1?key=AIzaSyDD3W5wJeJF2esffZMQxNtEl9tt-OfgSq4', (error,data) => { 
                if (error) {
                    window.RFFApp.model.rejectTooltip(error);
                    throw error;
                }
                var values = data.values;
                model.tooltips = this.returnKeyValues(values);
            });
        },
        clearSearch(){
            var input = document.querySelector('#collection-search input');
            input.value = '';
            input.setAttribute('placeholder', 'Search by title, author, or year');
            this.clearSearchMessage();
        },
        clearSearchMessage(){
            document.querySelectorAll('.no-results-message').forEach(msg => {
                msg.innerHTML = '';
            });
        },
        getSearchItems(keys, input) {
            var searchItems = model.zoteroItems.filter(item => keys.indexOf(item.key) !== -1 );
            console.log(searchItems);
            filterResults.call(view, searchItems, controller);
            view.updatePieChart(searchItems, 'matching search: "' + input + '"')
        },
       
        childrenify(data){
            console.log(data); 
            data.forEach(d => {
                if ( d.data.parentCollection !== false && d.meta.numItems > 0 ) { // ie has a parent and has items (exclude empty subcollections)
                    let match = data.find(collection => collection.key === d.data.parentCollection);
                    if ( match !== undefined ){
                        match.children = match.children || [];
                        match.children.push(d);
                    }
                }
            }); 
            return data; 
 
        },
        returnKeyValues(values, coerce){
            return values.slice(1).map(row => row.reduce((acc, cur, i) => { 
            
        
                acc[values[0][i]] = coerce === true ? isNaN(+cur) || cur === '' ? cur : +cur : cur; 
                return acc;
        
                                                  // test for empty strings before coercing bc +'' => 0
            }, {}));
            
           
        },
        nestPrelim(nestByArray){
            // recursive  nesting function, prelim step to recursiveNest
            return nestByArray.reduce((acc, cur) => {
                if (typeof cur !== 'string' && typeof cur !== 'function' ) { throw 'each nestBy item must be a string or function'; }
                var rtn;
                if ( typeof cur === 'string' ){
                    rtn = acc.key(function(d){
                        return d[cur];
                    });    
                }
                if ( typeof cur === 'function' ){
                    rtn = acc.key(function(d){
                        return cur(d);
                    });
                }
                
                return rtn;
            }, d3.nest());
        },
        recursiveNest(values, nestBy, nestType = 'series'){
            
            // nestBy = string or array of field(s) to nest by, or a custom function, or an array of strings or functions;
                      
            if ( typeof nestBy === 'string' || typeof nestBy === 'function' ) { // ie only one nestBy field or funciton
                this.nestByArray = [nestBy];
            } else {
                if (!Array.isArray(nestBy)) { throw 'nestBy variable must be a string, function, or array of strings or functions'; }
                this.nestByArray = nestBy;
            }
            var prelim = this.nestPrelim(this.nestByArray);
            
            if ( nestType === 'object' ){
                return prelim
                    .object(values);
            } else {
                return prelim
                    .entries(values);
            }
        },
        getZoteroCollections(){ // IMPORTANT this will break if # of collections exceeds 100. will needs to 
                                // implement strategy use for getting items

            
            /*if ( useLocal ){
                model.collections = this.childrenify(zoteroCollections);
                console.log('increment gateCheck from get collections');
                this.gateCheck++;
                view.init();
                return;
            }*/

            var promise = new Promise((resolve,reject) => {
                var attempt = 0;
                var msgTimer;
                function tryRequest(){
                    clearTimeout(msgTimer);
                    msgTimer = setTimeout(() => {
                        controller.fadeInText(document.querySelector('#loading-status'),'Zotero is taking a while. Please be patient.')
                    },5000);
                    d3.json('https://api.zotero.org/groups/' + groupId + '/collections?limit=100', (error,data) => {
                        console.log(data);
                        if (error) {
                            if ( attempt < 3 ){
                                console.log('Error, attempt ' + attempt + ': ', error);
                                attempt++;
                                tryRequest();
                            } else {
                                controller.fadeInText(document.querySelector('#loading-error'),'There was an error loading collections from Zotero. Please try again.')
                                reject(error);
                                throw error;
                            }
                        } else {
                            console.log(JSON.stringify(data));
                            model.collections = this.childrenify(data);
                            controller.fadeInText(document.querySelector('#loading-status'),'Zotero collections received')
                            clearTimeout(msgTimer);
                           // model.collections = this.recursiveNest(data, [d => d.data.parentCollection, d => d.data.parentCollection]);
                            resolve(model.collections); 
                        }
                    });
                }
                tryRequest.call(this);
            });
            promise.then(data => {  
                console.log(data);
                
                
                console.log('increment gateCheck from get collections');
                this.gateCheck++;
                view.init();
            }); 
        },
        fadeOutText(el){
            el.classList.add('no-opacity');
        },
        fadeInText(el,text){
            return new Promise((resolve) => {
                var durationStr = window.getComputedStyle(el).getPropertyValue('transition-duration');
                var duration = parseFloat(durationStr) * 1000;
                console.log(duration);
                controller.fadeOutText(el);
                setTimeout(() => {
                    el.innerHTML = text;
                    el.classList.remove('no-opacity');
                    resolve(true);
                }, duration);
            });

        }, 
        getZoteroItems(){   

           /* if ( useLocal ){
                model.zoteroItems = zoteroItems;
                this.parseZoteroItemDates();
                console.log('increment gateCheck from get items');
                this.gateCheck++;
                view.init();
                return;
            }*/

            var initialItemsPromises = [],
                subsequentItemsPromises = [],
                initialMax = 9, // last known number of times the API must be hit to get all results. 100 returned at a time,
                                // so 3 would get up to 300 hundred. time of coding total was 284; when the toal increases
                                // the code below will make addition API calls
                throttle = 500, // ms by which to delay successive api calls to avoid 500 error (?)
                overallIndex = 1;
            
            function constructPromise(i,overallIndex){
                var promise = new Promise((resolve,reject) => { // using d3.request instead of .json to have access to the 
                                                                // response headers. 'Total-Results', in partucular
                    var attempt = 0;
                    var msgTimer;
                    function tryRequest(){
                        clearTimeout(msgTimer);
                        msgTimer = setTimeout(() => {
                            controller.fadeInText(document.querySelector('#loading-status'),'Zotero is taking a while. Please be patient.')
                        },5000);
                        d3.request('https://api.zotero.org/groups/' + groupId + '/items/top?include=data,bib&limit=100&start=' + ( i * 100 ), (error,xhr) => { 
                            if (error) {
                                if ( attempt < 3 ){
                                    console.log('Error, attempt ' + attempt + ': ', error);
                                    attempt++;
                                    tryRequest();
                                } else {
                                    controller.fadeInText(document.querySelector('#loading-error'),`There was an error loading items set ${overallIndex} from Zotero. Please try again.`)
                                    reject(error);
                                    throw error;
                                }
                            } else {
                                console.log(+xhr.getResponseHeader('last-modified-version'));
                                clearTimeout(msgTimer);
                                controller.fadeInText(document.querySelector('#loading-status'), `Zotero items set ${overallIndex} received`)
                                //model.lastModifiedVersion = model.lastModifiedVersion || +xhr.getResponseHeader('last-modified-version');
                                resolve({
                                    total: +xhr.getResponseHeader('Total-Results'), // + operand coerces to number
                                    data: JSON.parse(xhr.responseText)
                                }); 
                            }
                        });
                    }
                    tryRequest();
                });
                return promise;     
            }

            for ( let i = 0; i < initialMax; i++ ){
                setTimeout(initialItemsPromises.push(constructPromise(i, overallIndex)), i * throttle);
                overallIndex++;
            }
            Promise.race(initialItemsPromises).then(value => {
                console.log(value);
                if ( value.total > initialMax ) {
                    for ( let i = initialMax; i < Math.ceil(value.total / 100); i++ ){
                        subsequentItemsPromises.push(constructPromise(i, overallIndex));
                        overallIndex++;
                    }
                    Promise.all([...initialItemsPromises,...subsequentItemsPromises]).then((values) => {
                        controller.fadeInText(document.querySelector('#loading-status'), `Almost there`)
                        setTimeout(() => {
                            window.dateStrings = [];
                            values.forEach(value => { 
                                //console.log(value.data.date);
                                model.zoteroItems.push(...value.data);
                            });
                            console.log(JSON.stringify(model.zoteroItems));
                            this.parseZoteroItemDates();
                            this.gateCheck++;
                            view.init();
                        },500);
                    });
                } else {
                    Promise.all(initialItemsPromises).then((values) => {
                        controller.fadeInText(document.querySelector('#loading-status'), `Almost there`)
                        setTimeout(() => {
                            console.log(values);
                            values.forEach(value => {
                                model.zoteroItems.push(...value.data);
                            });
                            this.parseZoteroItemDates(); 
                            this.gateCeck++;
                            view.init();
                        },500);
                    });        
                }
                
            });
            
        },
        parseZoteroItemDates(){
            model.zoteroItems.forEach(d => { // TODO  way too repetitive of above
              
                var parsedDates = this.getDatesFromString(d.data.date);
                d.data.dateString = parsedDates.display;
                d.data.dateValue = parsedDates.value;
            }); 
            model.zoteroItems.sort((a,b) => d3.descending(a.data.dateValue, b.data.dateValue)); 
      },
        getCollectionItems(collectionKey){
            console.log('In get collection Items');
            console.log(collectionKey);
            var collections = [];
            var synthesisItems = []; 
            if ( collectionKey !== 'initial' ){
                collections = collectionKey !== 'syntheses-only' ? [model.collections.find(c => c.key === collectionKey )] : model.collections;
            }
            var collectionItems = collectionKey === 'initial' ? model.zoteroItems : collectionKey === 'syntheses-only' ? [] : model.zoteroItems.filter(z => z.data.collections.indexOf(collectionKey) !== -1 );
            console.log(collectionItems);
            collections.forEach(collection => {
                if ( collection !== undefined && collection.children ) {
                    collection.children.forEach(child => { // to do make more DRY
                        var matches = model.zoteroItems.filter(z => ( z.data.collections.indexOf(child.key) !== -1 && ( child.data.name === 'Literature Review' || child.data.name === 'Issue Brief') ));

                        matches.forEach(match => {
                            console.log(child.data);
                            match.synthesisType = child.data.name;
                        });
                        synthesisItems.push(...matches);
                    });
                }
            });
            createResultsContainer.call(view);
            filterResults.call(view, collectionItems, controller, collectionKey);
            view.filterSynthesisResults(synthesisItems);
            view.updatePieChart(collectionItems, (collections.length === 0 ? 'All topics' : collections.length === 1 ? collections[0].data.name : 'Curated reviews') );

            /*var promise = new Promise((resolve,reject) => {
                d3.text('https://api.zotero.org/groups/' + groupId + '/collections/' + collectionKey + '/items?format=keys', (error,text) => {
                    if (error) {
                        reject(error);
                        throw error;
                    }
                    resolve(text); 
                });
            });
            promise.then(text => {
                var keys = text.split('\n'); // API response is text of keys with newline between
                if ( keys[keys.length - 1] === '' ){ // the last item seems to be an empty string (newline at end)
                                                     // this checks for that and removes it (pop()) if true
                    keys.pop();
                }
            });*/
        },
        getDatesFromString(string){
       //     console.log(string);
            var value = new Date(1776,3,4), // so that pubs without dates are sorted properly (null == 0 == 1970);
                display = '',
                matchTypes = {
                    forthcoming:/forthcoming/,
                    yyyy:       /^(\d{4})$/,
                    yyyymmdd:   /(\d{4})[-/](\d{1,2})[-/](\d{1,2})/, 
                    monthddyyyy:/^(\w+)\.* *(\d{1,2}), *(\d{4})/,
                    monthyyyy:  /^(\w+)\.* (\d{4})/,
                    yyyymm:     /^(\d{4})[-/](\d{1,2})$/,
                    mmddyyyy:   /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/,
                    yyyyyyyy:   /^(\d{4})[-–—]\d{4}/,
                    yyyymonthdd:/^(\d{4}) *(\w+)\.* *(\d{1,2})/ 
            };
            
            function checkMonth(str){
                if ( months[str] !== undefined && isNaN(months[str]) ) {
                    return months[str];
                }
                return str;
            }
            
            var months = {
                '0': 'January',
                '1': 'February',
                '2': 'March',
                '3': 'April',
                '4': 'May',
                '5': 'June',
                '6': 'July',
                '7': 'August',
                '8': 'September',
                '9': 'October',
               '10': 'November',
               '11': 'December',
                'January':  0,
                'February': 1,
                'March':    2,
                'April':    3,
                'May':      4,
                'June':     5,
                'July':     6,
                'August':   7,
                'September':8,
                'October':  9,
                'November': 10,
                'December': 11,
                'Winter':   11,
                'Spring':   2,
                'Summer':   5,
                'Fall':     8,
                'Autumn':   8,
                'Jan': 'January',
                'Feb': 'February',
                'Mar': 'March',
                'Apr': 'April',
                'Jun': 'June',
                'Jul': 'July',
                'Aug': 'August',
                'Sep': 'September',
                'Sept': 'September',
                'Oct': 'October',
                'Nov': 'Novemeber',
                'Dec': 'December'
            };
            for (var type in matchTypes) {
                if ( matchTypes.hasOwnProperty(type) && string !== undefined ) {
                    let match = string.match(matchTypes[type]);      
                    if ( match !== null ) {
                      
                        switch ( type ) {
                            case 'yyyy':
                                display = string;
                                value = new Date(+match[1],0,1);
                                break;
                            case 'yyyymmdd':
                                display = `${months[(+match[2] - 1).toString()]} ${+match[3]}, ${match[1]}`; 
                                value = new Date(+match[1], +match[2] - 1, +match[3]);
                                break;
                            case 'monthddyyyy':
                                display = `${checkMonth(match[1])} ${+match[2]}, ${match[3]}`;
                                value = new Date(+match[3], months[checkMonth(match[1])], +match[2]); 
                                break;
                            case 'monthyyyy':
                                display = `${checkMonth(match[1])} ${match[2]}`;
                                value = new Date(+match[2], months[checkMonth(match[1])], 1); 
                                break;
                            case 'yyyymm':
                                display = months[(+match[2] - 1)] + ' ' + match[1];
                                value = new Date(+match[1], +match[2] - 1, 1);
                                break;
                            case 'mmddyyyy':
                                display = `${months[(+match[1] - 1)]} ${+match[2]}, ${match[3]}`; 
                                value = new Date(+match[3], +match[1] - 1, +match[2]);
                                break;
                            case 'yyyyyyyy':
                                display = string.replace('-','—').replace('-','–');
                                value = new Date(+match[1],0,1);
                                break;
                            case 'yyyymonthdd':
                                display = `${checkMonth(match[2])} ${+match[3]}, ${match[1]}`;
                                value = new Date(+match[1], months[checkMonth(match[2])], +match[3]); 
                                break;
                            case 'forthcoming':
                                display =  'forthcoming';
                                value =  new Date();
                                break;
                        } 
                    }
                }
            }  
            return {
                value,
                display
            };
        },
        biblioTooltips(){
            tippy('.tippy-clipboard', {
                arrow: true,
                theme:'RFF',
                trigger: 'manual'
            });
            tippy('.copy-bib', {
                arrow: true,
                hideOnClick: false,
                interactive: true,
                theme:'RFF',
            });
        },
        copyBibText(){
          // this = element
          var bibEntry = this.parentNode.querySelector('.bib-container');
         // bibEntry.focus();
          bibEntry.select();
          try {
            var successful = document.execCommand('copy');
            var msg = successful ? 'successful' : 'unsuccessful';
            console.log('Copying text command was ' + msg);
            if ( successful ) {
                this.parentNode._tippy.show();
                setTimeout(() => {
                    this.parentNode._tippy.hide();
                },1000);
                //this._tippy.popper.querySelector('.tippy-content').textContent = 'Copied to clipboard';
            }
          } catch (err) {
            console.log('Oops, unable to copy');
          }

        },
        loading(isLoading){
            if ( isLoading ){
                document.querySelector('body').classList.add('loading');
            } else {
                document.querySelector('body').classList.remove('loading');
            }
        },  
        noSearchResults(term){
            this.clearSearch();
            document.querySelectorAll('.no-results-message').forEach(msg => {
                msg.innerHTML = `No results for "${term}"`;
            });
           
               
        }

    }; 
 
    var model = {
        zoteroItems: []
    }; 
    
    var view = { 
        init(){
            smoothscroll.polyfill();
            console.log(controller.gateCheck);
            if ( controller.gateCheck < 2 ){
                //console.log('return');
                return;
            }
            setTimeout(() => {
                controller.fadeInText(document.querySelector('#loading-status'),'Initializing the view');
            });
            console.log('READY!');
            console.log(model.zoteroItems);
            this.renderTopicButtons();
            this.attachTooltips();
            console.log(model.collections);
            //var initialCategory = document.querySelector('.browse-buttons div').dataset.collection;
            controller.getCollectionItems('initial');
            // two lines above leftovers from when list loaded with first category
            // the next two lines to list all pubs weren't working without them
            // being called first
            //filterResults.call(view, undefined, controller);
            //view.filterSynthesisResults.call(view,[]);
            controller.fadeInText(document.querySelector('#loading-status'),'Almost ready')
            this.setupSidebar();
            this.removeSplash();
            controller.loading(false);
           
        },
        removeSplash(){

            document.querySelector('body').classList.add('sharc-loaded')
            setTimeout(() => {
                var splash = document.querySelector('#loading-splash');
                splash.parentNode.removeChild(splash);
            }, 700);
        },
        smoothScroll(elem){
            elem.scrollIntoView({ behavior: 'smooth' })
        },
        attachTooltips(){
            document.querySelectorAll('.browse-buttons > div').forEach(btn => {
                var match = model.tooltips.find(d => d.key === btn.dataset.collection);
                if ( match !== undefined ){
                    btn.setAttribute('title', match.title);
                    tippy.one(btn, {
                        theme:'RFF',
                        arrow: true
                    });
                }
            });
        },
        setupSidebar(){

          
            var months = {
                '0': 'January',
                '1': 'February',
                '2': 'March',
                '3': 'April',
                '4': 'May',
                '5': 'June',
                '6': 'July',
                '7': 'August',
                '8': 'September',
                '9': 'October',
               '10': 'November',
               '11': 'December'
            };
            var lastModifiedDate = d3.max(model.zoteroItems, d => new Date(d.data.dateModified));
            var version = d3.max(model.zoteroItems, d => d.data.version);
            var sidebar = document.querySelector('#sidebar');
            this.controlToggleButton(sidebar);
            var html = `
            <p>Date last modified: ${lastModifiedDate.getDate()} ${months[lastModifiedDate.getMonth()]} ${lastModifiedDate.getFullYear()}<br />(Version ${version})</p>
            `;

            this.makePieChart();
            sidebar.insertAdjacentHTML('beforeend', html);
            this.addSearch();  

            this.sidebarContact();   
            this.sibebarDocumentation();     

        },
        controlToggleButton(sidebar){
            var button = document.querySelector('button.toggle-sidebar');
            button.onclick = () => {
                console.log('click');
                this.toggleSidebar(sidebar, button);
            };
        },
        toggleSidebar(sidebar, button){
            console.log('click');
            sidebar.classList.toggle('show');
            button.innerHTML = button.innerHTML === 'more' ? 'close' : 'more';
            document.querySelector('body').classList.toggle('scroll-lock');
            document.querySelector('html').classList.toggle('scroll-lock');
        },
        addSearch(){
            document.querySelector('#sidebar').insertAdjacentHTML('beforeend', searchHTML);
            searchOnRender();
            function searchOnRender(){
                document.getElementById('collection-search').onsubmit = function(e){
                    e.preventDefault();
                    controller.loading(true);
                    var input = this.querySelector('input').value;
                    var APIString = 'https://api.zotero.org/groups/' + groupId + '/items/top?q=' + input + '&format=keys';
                    var promise = new Promise((resolve,reject) => {
                        d3.text(APIString, (error,data) => {
                            if (error) {
                                reject(error);
                                throw error;
                            }
                            var splitData = data.split(/\n/) || [data];
                            console.log(splitData);
                            resolve(splitData); 
                        });
                    });
                    promise.then(v => {
                        console.log(v);
                        if (v[0] !== ''){
                            controller.clearSearchMessage();
                            controller.getSearchItems(v, input);
                        } else {
                            controller.noSearchResults(input);
                        }
                        controller.loading(false);
                    });
                };
            }
        },
        sibebarDocumentation(){
            var div = document.createElement('div');
            div.className = 'documentation';
            div.innerHTML = `
            <h3>Documentation</h3>
            <p><a href="http://www.rff.org/files/faq.pdf">SHARC Frequently Asked Questions</a> (PDF)</p>
            <p><a href="http://www.rff.org/files/how-sharc-is-built.pdf">How SHARC Is Built</a> (PDF)</p>
            `;
            document.querySelector('#sidebar').appendChild(div);
        },
        sidebarContact(){
             var div = document.createElement('div');
            div.className = 'contact-us';
          div.innerHTML = `
            <h3>Get in touch</h3>
              <form><!--<form method="POST" action="http://formspree.io/XXXXXXX" _lpchecked="1">-->
              <input type="email" name="email" placeholder="Your email">
              <textarea name="message" placeholder="Your message"></textarea>
                <input type="text" name="_gotcha" style="display:none">
                <input type="hidden" name="_next" value="/projects/?thanks">
              <button type="submit">Send</button>
            </form>
          `;  
          document.querySelector('#sidebar').appendChild(div);
        },
        makePieChart(){
            document.querySelector('#sidebar').insertAdjacentHTML('beforeend', '<h3>Publications by type</h3><p id="pie-header"></p>');
            
            var svg = d3.select('#sidebar')
                .append('svg')
                  .attr('width', '100%')
                  .attr('xmlns','http://www.w3.org/2000/svg')
                  .attr('version','1.1')
                  .attr('viewBox', `0 0 100 62`)
                  .attr('focusable',false)
                  .attr('aria-labelledby', `svgTitle svgDesc`)
                  .attr('role','graphics-dataunit')
                  .attr('class', 'pubtype-pie');

                svg.append('title')
                    .attr('id', `svgTitle`)
                    .text(`Pie chart of publication types`);

                svg.append('desc')
                    .attr('id',`svgDesc`)
                    .text(`Pie chart of publication types`);

            svg.append('g');

            d3.select('#sidebar svg').append('g')
                .attr('class','legend');
                
            d3.select('#sidebar svg').append('text')
                .attr('class', 'total')
                
                .attr('font-size', 10)
                .attr('text-anchor', 'middle');
                
            this.updatePieChart(model.zoteroItems, 'All topics');
        },

        updatePieChart(items, topic){

            d3.select('#sidebar #pie-header')
                .text(topic);
            console.log(items);
            //var t = d3.transition().duration(250);
            
            var radius = 30;
            var pieSegments = 5;
            var rollup = d3.nest().key(d => d.data.itemType).rollup(v => v.length).entries(items.filter(d => d.data.itemType !== 'attachment')).sort((a,b) => d3.descending(a.value, b.value));
            var totalNumber = rollup.reduce((acc,cur) => acc + cur.value, 0);
            var pieData = [];
            rollup.forEach((d, i) => {
                if ( i < pieSegments - 1 ){
                    pieData.push( {
                                            name: d.key,
                                            value: d.value
                                        });
                } else if ( i === pieSegments - 1 ){
                    let combinedValue = rollup.slice(i).reduce((acc, cur) => acc + cur.value,0);
                    pieData.push( {
                                            name: 'other',
                                            value: combinedValue
                                        });
                } 
            });
            console.log(pieData);
            var pie = d3.pie().sort(null).value(d => d.value);
            console.log(pie(pieData));
            var path = d3.arc()
                .outerRadius(radius)
                .innerRadius(radius / 1.5 );

            var label = d3.arc()
                .outerRadius(radius * .85)
                .innerRadius( radius * .85 );

            var g = d3.select('#sidebar svg g')
                .attr('transform', `translate(${radius},${radius})`);
           
            var arc = g.selectAll('.arc')
                .data(pie(pieData), d => d.data.name);

            /* UPDATE EXISTING */               
            arc.select('path')
                .attr('d', path);
            arc.select('text')
                .attr('transform', d => 'translate(' + label.centroid(d) + ')')
                .text(d => d.data.value);

            /* REMOVE EXITING */
            arc.exit()
               // .attr('class', 'exit')
                .remove();
            
            /* ADD ENTERING */

            var entering = arc.enter().append('g')
                .attr('class', d => {
                    console.log(d);
                    return 'arc ' + d.data.name;
                });

            entering
                .append('path')
                  .attr('d', path);

             entering.append('text')
              .attr('transform', d => 'translate(' + label.centroid(d) + ')')
              .attr('dy', '0.35em')
              .attr('text-anchor', 'middle')
              .attr('font-size', 4)
              .attr('fill', d => {
                if (d.data.name === 'journalArticle' || d.data.name === 'book' || d.data.name === 'report' || d.data.name === 'magazineArticle'){
                    return '#ffffff';
                } else {
                    return '#000000';
                }
              })
              .text(d => d.data.value);

            var pubTypes = {
                book: 'books',
                bookSection: 'book chapters',
                journalArticle: 'journal articles',
                magazineArticle: 'magazine articles',
                newspaperArticle: 'newspaper articles',
                thesis: 'theses',
                letter: 'letters',
                manuscript: 'manuscripts',
                interview: 'interviews',
                film: 'films',
                artwork: 'artwork',
                webpage: 'webpages',
                report: 'reports',
                bill: 'bills',
                case: 'cases',
                hearing: 'hearings',
                patent: 'patents',
                statute: 'statutes',
                email: 'emails',
                map: 'maps',
                blogPost: 'blog posts',
                instantMessage: 'instant messages',
                forumPost: 'form post',
                audioRecording: 'audio',
                presentation: 'presentation',
                videoRecording: 'video',
                tvBroadcast: 'TV',
                radioBroadcast: 'radio',
                podcast: 'podcasts',
                computerProgram: 'software',
                conferencePaper: 'conference papers',
                document: 'documents',
                encyclopediaArticle: 'encyclopedia',
                dictionaryEntry: 'dictionary entries',
                other: 'other'
            }

            var legend = d3.select('#sidebar svg g.legend')
                .attr('transform', 'translate(' + ( radius * 2 + 5 ) + ',2)');
            
            legend
                .selectAll('.legend-item')
                .remove();
            
            var legendItems = legend
                .selectAll('.legend-item')
                .data(pie(pieData), d => d.data.name);

           
            var enteringL = legendItems
                .enter().append('g')
                .attr('class', d => 'legend-item ' + d.data.name)
                .attr('transform', (d,i) => 'translate(0,' + i * 7 + ')');

                enteringL
                    .append('rect')
                    //.attr('class', d => d.data.name)
                    .attr('width', 5)
                    .attr('height', 5);

                enteringL
                    .append('text')
                    .attr('transform', 'translate(7,4)')
                    .attr('font-size', 4)
                    .text(d => pubTypes[d.data.name]);

            d3.select('#sidebar svg text.total')
                .attr('transform', `translate(${radius},${radius})`)
                .text(() => {
                    if ( totalNumber > 0 ) {
                        return totalNumber;
                    } else {
                        return null;
                    }
                });


          
        },
        
        renderTopicButtons(){
            var section = document.getElementById('browse-buttons-container');
            var categories = model.collections.filter(d => d.data.parentCollection === false).sort((a,b) => d3.ascending(a.data.name, b.data.name));
            console.log(categories);
            //model.collections.false.sort((a,b) => d3.ascending(a.data.name, b.data.name)); // 'false' key => top-lvel categories
            categories.filter(d => d.children !== undefined).forEach(function(d,i){
                section.appendChild(createBrowseCategory(d,i,true));
            });
            categories.filter(d => d.children === undefined).forEach(function(d,i){
                section.appendChild(createBrowseCategory(d,i,false));
            });
            window.RFFApp.model.resolveTopicButtons(true);
            createTopicKey();
            this.renderShowAllButton();
            this.renderShowAllSyntheses();
        },
        renderShowAllButton(){

            var div = document.createElement('div');
            div.id = 'show-all-container';
            div.className = 'browse-buttons';

            var btn = document.createElement('div');
            btn.className = 'button button--secondary show-all active';
            div.appendChild(btn);

            document.querySelector('#browse-buttons-container').insertAdjacentHTML('afterbegin', div.outerHTML);
            var showAll = d3.select('div.show-all');

            showAll
                .on('click', function(){
                    controller.loading(true);
                    setTimeout(() => { // setTimeout needed to allow for load to take effect
                        d3.selectAll('.browse-buttons .button')  // not DRY; need to bring out into fn; browsebuttons 
                                                                 // do the same thing
                            .classed('active', false);
                        d3.select(this)
                            .classed('active', true);
                        filterResults.call(view, undefined, controller);
                        view.filterSynthesisResults.call(view,[]);
                        view.updatePieChart(model.zoteroItems, 'All topics');
                        controller.clearSearch();
                        controller.loading(false);
                    });
                    
                });
            showAll     
                .append('span')
                .text('Show full collection');
            
        },
        renderShowAllSyntheses(){
            
            var showAll = d3.select('#show-all-container')
                .append('div')
                .attr('class', 'button button--secondary show-syntheses');
            showAll
                .on('click', function(){
                  controller.loading(true);
                   setTimeout(() => {
                       d3.selectAll('.browse-buttons .button')  // not DRY; need to bring out into fn; browsebuttons 
                                                                 // do the same thing
                            .classed('active', false);
                        d3.select(this)
                            .classed('active', true);
                        controller.getCollectionItems('syntheses-only');
                        //filterResults.call(view, 'none', controller);
                        //view.filterSynthesisResults.call(view,[]);
                        //view.updatePieChart(model.zoteroItems, 'Curated reviews');
                        controller.clearSearch();
                        controller.loading(false);
                  });
                });
            showAll     
                .append('span')
                .text('Show curated reviews');
            
        },

        filterSynthesisResults(matches){ // needs to be more DRY re: code above
            console.log(matches);
            var items = d3.select('.synthesis-results ul').selectAll('.list-item')
                .data(matches, d => d.data.key);
                console.log(items);
            items.exit()
                .classed('entered',false)
                .classed('exiting', true)
                .transition(1500).remove();

            var entering = items.enter()
                .append('li')
                .attr('id', d => d.key)
                .attr('class', (d,i) => ( d.synthesisType.cleanString() || d.data.itemType )  + ' index-' + i + ( d.data.institution === 'RFF' || d.data.institution === 'Resources for the Future' ? ' RFF' : ''))
                .classed('RFF', true)
                .classed('entering', true)
                .classed('list-item', true)
                .html(d => createResultItem(d));
                

            setTimeout(function(){
                entering.classed('entering',false);    
            });

            this.synthesisItems = entering.merge(items); 
           

        }
    };
    window.RFFApp = {
        controller,
        model 
    };
    controller.init(); // pass in `true` to use local snapshot instead of API
     
}()); // end IIFE 