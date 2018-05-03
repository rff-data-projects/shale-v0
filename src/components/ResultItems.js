export const createResultsContainer = function(){
  var html = `<div id="synthesis-results">
                  <ul class="flex space-between"></ul>
              </div>
              <div id="results">
                  <ul class="load"></ul>
              </div> `;
  document.getElementById('results-container').innerHTML = html;
  this.results = document.querySelector('#results ul');
};

export const createResultItem = function(d){
    /* global RFFApp */
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
    var details = '';

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
        bibContainer.setAttribute('class','bib-container');
        let link = document.createElement('a');
        link.setAttribute('href', '#');
        link.setAttribute('class','details-link copy-bib');
        link.innerHTML = 'Copy biblio. info';
        details += bibContainer.outerHTML + link.outerHTML;
    }

    

    details = details !== '' ? details : '< nothing to show >';

      return `
              <div class="detail-results-wrapper">
                  <div class="detail-results">${ details }</div>
              </div>
              <div class="summary-results">
                  <div class="flex space-between">
                      <span class="flex item-info items-center">
                          <span class="list-item__label">${d.synthesisType || d.data.itemType.undoCamelCase()}</span>
                          <span class="list-item__meta publisher-name">${publisher.trunc(90,true)}</span>
                      </span>
                      <span class="list-item__meta">${d.data.dateString}</span>
                  </div>
                  <h3 class="list-item__title"><a class="item-title-link" href="#">${d.data.title}</a></h3>
                  <span class="list-item__meta">${authorStr}</span>
              </div>
              `;
}
