import './css/main.scss';
import '../helpers/string-helpers';
import tooltips from './data/tooltips.csv';
import tippy from 'tippy.js';
import { createBrowseCategory, createTopicKey } from './components/BrowseButtons';
import { createResultsContainer, createResultItem, filterResults } from './components/ResultItems'; 
import smoothscroll from 'smoothscroll-polyfill';
//import SWHandler from './utils/service-worker-handler.js';
   
(function(){     
/* global d3 */
"use strict";  
    const groupId = '2127948';
    var controller = { 
        gateCheck: 0, 
        searchType: 'fields',
        init(useLocal){ // pass in true to bypass API and use local data

            //SWHandler.init();

            window.RFFApp.model.topicButtonPromise = new Promise((resolve) => {
                window.RFFApp.model.resolveTopicButtons = resolve;
            });
            this.getZoteroCollections(useLocal);
            this.getZoteroItems(useLocal);
            this.setupSearch();
            console.log(tooltips);
            
        },
        setupSearch(){
            document.getElementById('collection-search').onsubmit = function(e){
                e.preventDefault();
                view.loading(true);
                var input = this.querySelector('input').value;
                var APIString = 'https://api.zotero.org/groups/' + groupId + '/items?q=' + input + '&format=keys';
                var promise = new Promise((resolve,reject) => {
                    d3.text(APIString, (error,data) => {
                        if (error) {
                            reject(error);
                            throw error;
                        }
                        
                        resolve(data.split(/\n/)); 
                    });
                });
                promise.then(v => {
                    console.log(v);
                    if (v[0] !== ''){
                        controller.getSearchItems(v);
                        view.loading(false);
                    }
                });
            };
        },
        getSearchItems(keys){
            var searchItems = model.zoteroItems.filter(item => keys.indexOf(item.key) !== -1 );
            console.log(searchItems);
            filterResults.call(view, searchItems, controller);
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
        getZoteroCollections(useLocal){ // IMPORTANT this will break if # of collections exceeds 100. will needs to 
                                // implement strategy use for getting items

            
            if ( useLocal ){
                d3.json('data/zoteroCollections-7-25-18.json', (error,data) => {
                    if ( error ) {
                        throw error;
                    }
                    model.collections = this.childrenify(data);
                    console.log('increment gateCheck from get collections');
                    this.gateCheck++;
                    view.init();
                });
                return;
            }
            var promise = new Promise((resolve,reject) => {
                var attempt = 0;
                function tryRequest(){
                    d3.json('https://api.zotero.org/groups/' + groupId + '/collections?limit=100', (error,data) => {
                        console.log(data);
                        if (error) {
                            if ( attempt < 3 ){
                                console.log('Error, attempt ' + attempt + ': ', error);
                                attempt++;
                                tryRequest();
                            } else {
                                reject(error);
                                throw error;
                            }
                        } else {
                            console.log(JSON.stringify(data));
                            model.collections = this.childrenify(data);
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
        getZoteroItems(useLocal){   

            if ( useLocal ){
                d3.json('data/zoteroItems-7-25-18.json', (error,data) => {
                    if ( error ) {
                        throw error;
                    }
                    model.zoteroItems = data;
                    this.parseZoteroItemDates();
                    console.log('increment gateCheck from get items');
                    this.gateCheck++;
                    view.init();
                });
                return;
            }

            var initialItemsPromises = [],
                subsequentItemsPromises = [],
                initialMax = 9, // last known number of times the API must be hit to get all results. 100 returned at a time,
                                // so 3 would get up to 300 hundred. time of coding total was 284; when the toal increases
                                // the code below will make addition API calls
                throttle = 500; // ms by which to delay successive api calls to avoid 500 error (?)
            
            function constructPromise(i){
                var promise = new Promise((resolve,reject) => { // using d3.request instead of .json to have access to the 
                                                                // response headers. 'Total-Results', in partucular
                    var attempt = 0;
                    function tryRequest(){
                        d3.request('https://api.zotero.org/groups/' + groupId + '/items/top?include=data,bib&limit=100&start=' + ( i * 100 ), (error,xhr) => { 
                            if (error) {
                                if ( attempt < 3 ){
                                    console.log('Error, attempt ' + attempt + ': ', error);
                                    attempt++;
                                    tryRequest();
                                } else {
                                    // TO DO: WHAT TO DO WHEN THERE'S AN ERROR ?
                                    reject(error);
                                    throw error;
                                }
                            } else {
                                console.log(+xhr.getResponseHeader('last-modified-version'));
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
                setTimeout(initialItemsPromises.push(constructPromise(i)), i * throttle);
            }
            Promise.race(initialItemsPromises).then(value => {
                console.log(value);
                if ( value.total > initialMax ) {
                    for ( let i = initialMax; i < Math.ceil(value.total / 100); i++ ){
                        subsequentItemsPromises.push(constructPromise(i));
                    }
                    Promise.all([...initialItemsPromises,...subsequentItemsPromises]).then((values) => {
                        window.dateStrings = [];
                        values.forEach(value => { 
                            //console.log(value.data.date);
                            model.zoteroItems.push(...value.data);
                        });
                        console.log(JSON.stringify(model.zoteroItems));
                        this.parseZoteroItemDates();
                        this.gateCheck++;
                        view.init();
                    });
                } else {
                    Promise.all(initialItemsPromises).then((values) => {
                        console.log(values);
                        values.forEach(value => {
                            model.zoteroItems.push(...value.data);
                        });
                        this.parseZoteroItemDates(); 
                        this.gateCeck++;
                        view.init();
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
            console.log(collectionKey);
            var collection = model.collections.find(c => c.key === collectionKey );
            console.log(collection);
            var collectionItems = model.zoteroItems.filter(z => z.data.collections.indexOf(collectionKey) !== -1);
            console.log(collectionItems);
            var synthesisItems = []; 
            if ( collection.children ) {
                collection.children.forEach(child => { // to do make more DRY
                    var matches = model.zoteroItems.filter(z => z.data.collections.indexOf(child.key) !== -1);
                    matches.forEach(match => {
                        match.synthesisType = child.data.name;
                    });
                    synthesisItems.push(...matches);
                });
            }
            createResultsContainer.call(view);
            filterResults.call(view, collectionItems, controller);
            view.filterSynthesisResults(synthesisItems);
            view.updatePieChart(collectionItems, collection.data.name);

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
            console.log('READY!');
            console.log(model.zoteroItems);
            this.renderTopicButtons();
            this.attachTooltips();
            console.log(model.collections);
            var initialCategory = document.querySelector('.browse-buttons div').dataset.collection;
            controller.getCollectionItems(initialCategory);
            // two lines above leftovers from when list loaded with first category
            // the next two lines to list all pubs weren't working without them
            // being called first
            filterResults.call(view, undefined, controller);
            view.filterSynthesisResults.call(view,[]);
            this.setupSidebar();
            this.loading(false);
           
        },
        smoothScroll(elem){
            elem.scrollIntoView({ behavior: 'smooth' })
        },
        attachTooltips(){
            document.querySelectorAll('.browse-buttons > div').forEach(btn => {
                var match = tooltips.find(d => d.key === btn.dataset.collection);
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
            sidebar.innerHTML = `
            <h2>Library info</h2>
            <p>Date last modified: ${lastModifiedDate.getDate()} ${months[lastModifiedDate.getMonth()]} ${lastModifiedDate.getFullYear()}<br />(Version ${version})</p>
            `;

            this.sidebarContact();   
            this.sibebarDocumentation();     
            this.makePieChart();  

        },
        sibebarDocumentation(){
            var div = document.createElement('div');
            div.className = 'documentation';
            div.innerHTML = `
            <h3>Documentation</h3>
            <p><a href="#">SHARC Frequently Asked Questions</a> (PDF)</p>
            <p><a href="#">How SHARC Is Built</a> (PDF)</p>
            `;
            document.querySelector('#sidebar').append(div);
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
          document.querySelector('#sidebar').append(div);
        },
        makePieChart(){
            var svg = d3.select('#sidebar2')
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

            d3.select('#sidebar2 svg').append('g')
                .attr('class','legend');
                
            d3.select('#sidebar2 svg').append('text')
                .attr('class', 'total')
                
                .attr('font-size', 10)
                .attr('text-anchor', 'middle');
                
            this.updatePieChart(model.zoteroItems, 'All topics');
        },

        updatePieChart(items, topic){

            d3.select('#sidebar2 #pie-header')
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

            var g = d3.select('#sidebar2 svg g')
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
                if (d.data.name === 'journalArticle' || d.data.name === 'book' || d.data.name === 'report'){
                    return '#ffffff';
                } else {
                    return '#000000';
                }
              })
              .text(d => d.data.value);

            var pubTypes = {
                journalArticle: 'journal articles',
                report: 'reports',
                webpage: 'webpages',
                book: 'books',
                other: 'other',
                bookSection: 'chapters',
                document: 'documents',
                magazineArticle: 'magazine articles',
                presentation: 'presentations'
            }

            var legend = d3.select('#sidebar2 svg g.legend')
                .attr('transform', 'translate(' + ( radius * 2 + 5 ) + ',2)');
            
            var legendItems = legend
                .selectAll('.legend-item')
                .data(pie(pieData), d => d.data.name);

            legendItems.select('g.legend-item')
                .attr('transform', (d,i) => 'translate(0,' + i * 7 + ')');

            legendItems.exit().remove();

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

            d3.select('#sidebar2 svg text.total')
                .attr('transform', `translate(${radius},${radius})`)
                .text(totalNumber);


          
        },
        loading(isLoading){
            if ( isLoading ){
                document.querySelector('body').classList.add('loading');
            } else {
                document.querySelector('body').classList.remove('loading');
            }
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
            this.renderShowAllButton();
        },
        renderShowAllButton(){
            var showAll = d3.select('.browse-buttons.uncategorized')  // should be in the view module
                .append('div')
                .classed('button button--tertiary show-all active',true)
                .on('click', function(){
                    d3.selectAll('.browse-buttons .button')  // not DRY; need to bring out into fn; browsebuttons 
                                                             // do the same thing
                        .classed('active', false);
                    d3.select(this)
                        .classed('active', true);
                    filterResults.call(view, undefined, controller);
                    view.filterSynthesisResults.call(view,[]);
                });
            showAll     
                .append('span')
                .text('Show all');
            createTopicKey();
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
                .html(d => createResultItem(d))
                .on('click', function(){
                    window.open('./pdf/' + this.id + '.pdf', '_blank');
                });

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
    controller.init(true); // pass in `true` to use local snapshot instead of API
     
}()); // end IIFE 