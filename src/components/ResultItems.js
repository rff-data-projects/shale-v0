import styles from './results-items.scss';
console.log(styles);
/* ******** */

export const createResultsContainer = function(){
  var html = `<div class="${styles['synthesis-results']}">
                  <ul class="flex space-between"></ul>
              </div>
              <div class="${styles.results}">
                  <ul class="${styles.load}"></ul>
              </div> `;
  document.getElementById('results-container').innerHTML = html;
  this.results = document.querySelector('div.results ul');
};

/* ******** */

export const createResultItem = function(d){
    var authorStr,
        authors;
    if ( d.data.creators === undefined ) {
        authorStr = '';
    } else {
        authors = d.data.creators.map(each => each.firstName + ' ' + each.lastName);
        authorStr = authors.join(',');
        if (authors.length === 2){
            authorStr = authorStr.replace(',',' and ');
        } else if ( authors.length > 4 ) {
            authorStr = authors[0] + ' et al.';
        } else {
            authorStr = authorStr.replace(/,/g,', ');
            let i = authorStr.lastIndexOf(',');
            if ( i !== -1 ){
                authorStr = authorStr.substr(0, i + 1) + ' and' + authorStr.substr(i + 1);
            }
        }
    }
    

    var publisher = d.data.publisher || d.data.journalAbbreviation || d.data.publicationTitle || d.data.institution || d.data.websiteTitle || '';

    var linksDiv = document.createElement('div');
    linksDiv.className = styles['links-div'] + ' tippy-clipboard';
    linksDiv.setAttribute('title', 'Copied to clipboard');
    var pubURL;
    if ( d.data.url && d.data.url !== '' ) {
        let link = document.createElement('a');
        pubURL = d.data.url;
        link.setAttribute('href', pubURL);
        link.setAttribute('target', '_blank')
        link.setAttribute('class',`${styles['details-link']}`);
        link.innerHTML = 'Go to link';
        linksDiv.appendChild(link);
    }

    if ( d.bib && d.bib !== '' ) {
        let placeholder = document.createElement('div');
        placeholder.innerHTML = d.bib;
        let textOnly = placeholder.querySelector('.csl-entry').innerHTML;
        let bibContainer = document.createElement('textarea');
        bibContainer.innerHTML = textOnly;
        bibContainer.setAttribute('class',styles['bib-container']);
        let link = document.createElement('a');
        link.setAttribute('href', '#');
        link.setAttribute('class',`${styles['copy-bib']}`);
        link.setAttribute('title', textOnly);
        link.innerHTML = 'Copy biblio. info';
        linksDiv.appendChild(bibContainer);
        linksDiv.appendChild(link);
    }
    var titleInnerHTML;
    if ( pubURL !== undefined ){
      titleInnerHTML = `<a class="item-title-link" target="_blank" href="${pubURL}">${d.data.title}</a>`;
    } else {
      titleInnerHTML = `${d.data.title}`;
    }
    /*var details = ''; 

    var topics = '';

    if ( d.data.collections && d.data.collections.length > 0 ) {
        topics = '<b>Topic:</b> ';
        if ( d.data.collections.length > 1 ) {
            topics = '<b>Topics: </b>';
        }
        d.data.collections.forEach((c,i) => {
            //console.log(c,d);
            var topicName = RFFApp.model.collections.find(d => d.key === c).data.name;
            topics += i > 0 ? ', ' + topicName : topicName;
        });
        details += topics + '<br />';
    }


    if ( d.data.url && d.data.url !== '' ) {
        let link = document.createElement('a');
        link.setAttribute('href', d.data.url);
        link.setAttribute('target', '_blank')
        link.setAttribute('class','details-link');
        link.innerHTML = 'Go to link';
        details += link.outerHTML + '<br />';
    }

    if ( d.data.DOI && d.data.DOI !== '' ) {
        details += 'DOI: ' + d.data.DOI + '<br />';
    }

    if ( d.bib && d.bib !== '' ) {
        let placeholder = document.createElement('div');
        placeholder.innerHTML = d.bib;
        let textOnly = placeholder.querySelector('.csl-entry').innerHTML;
        let bibContainer = document.createElement('textarea');
        bibContainer.innerHTML = textOnly;
        bibContainer.setAttribute('class',styles['bib-container']);
        let link = document.createElement('a');
        link.setAttribute('href', '#');
        link.setAttribute('class','details-link copy-bib');
        link.innerHTML = 'Copy biblio. info';
        details += bibContainer.outerHTML + link.outerHTML;
    }

    

    details = details !== '' ? details : '< nothing to show >';*/

      return `
              
              <div class="${styles['summary-results']}">
                  <div class="flex space-between">
                      <span class="flex ${styles['item-info']} ${styles['items-center']}">
                          <span class="list-item__label">${d.synthesisType || d.data.itemType.undoCamelCase()}</span>
                          <span class="list-item__meta ${styles['publisher-name']}">${publisher.trunc(90,true)}</span>
                      </span>
                      <span class="list-item__meta">${d.data.dateString}</span>
                  </div>
                  <h3 class="list-item__title">${titleInnerHTML}</h3>
                  <span class="list-item__meta">${authorStr}</span>
                  ${linksDiv.outerHTML}
              </div>
              `;
}


/* ******** */

export const filterResults = function(matches, controller){
  /* global d3 */
  console.log(styles['list-item']);
    var filteredData = matches === undefined ? window.RFFApp.model.zoteroItems : matches; 
    var items = d3.select(this.results).selectAll('.' + styles['list-item'])
        .data(filteredData, d => d.key);

        // update existing
  /*  items
        .classed('entered',false)
        .classed('remained', true);
*/
    // transition and remove exiting
    
    items.exit()
        .classed(styles.entered,false)
        .classed(styles.exiting, true)
        .transition(1500).remove();

    var entering = items.enter()
        .append('li')
        .attr('class', (d,i) => d.key + ' ' + d.data.itemType + ' index-' + i + ( d.data.institution === 'RFF' || d.data.institution === 'Resources for the Future' ? ' RFF' : ''))
        .classed('entering', true)
        .classed('list-item', true)
        .html(d => createResultItem(d));
        

    setTimeout(function(){
        entering.classed('entering',false);   
    });

    this.items = entering.merge(items); 
   /* d3.selectAll('.item-title-link')
        .on('click', function(){
            console.log('click');
            console.log(d3.event);
            d3.event.preventDefault();     
        });*/
    d3.selectAll('.copy-bib')
        .on('click', function(){
            d3.event.preventDefault();
            controller.copyBibText.call(this);
        });




}; 
