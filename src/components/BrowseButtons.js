import styles from './browse-buttons.scss';

console.log(styles);
export const createBrowseCategory = function(category, index, isCategorized){
  /* global d3, RFFApp */
  var categoryDiv = document.createElement('div');
  var container;
  
  if ( isCategorized ){
    categoryDiv.innerHTML = `
      <h3>${category.data.name}</h3>
    `;
    container = document.createElement('div');
    container.className = 'browse-buttons';
    category.children.sort((a,b) => d3.ascending(a.data.name, b.data.name)).forEach((d,i) => {
      container.appendChild(createBrowseButton(d,i));
    });
  } else {
    container = document.querySelector('.browse-buttons.uncategorized') || document.createElement('div');
    container.className = 'browse-buttons uncategorized';
    if ( category.data.name.indexOf('_') !== 0 ){
        container.appendChild(createBrowseButton(category));
    }
  }
  console.log(category);
  categoryDiv.appendChild(container);
  console.log(categoryDiv);

  
  return categoryDiv;
    
  function createBrowseButton(collection){
    var childrenClasses = [];
    if ( collection.children ) {
     
      childrenClasses = collection.children.map(each => each.data.name.cleanString());
    }
    console.log(styles,childrenClasses);
    var parent = document.createElement('div');
    parent.innerHTML = `
    <div title="not loaded" data-collection="${collection.key}" class="button button--${ isCategorized ? 'secondary' : 'tertiary'} ${ childrenClasses.reduce((acc,cur) => acc + cur + ' ','')}">
      <span>${collection.data.name}</span>
    </div>`;

    var browseButton = parent.children[0]; 

    browseButton.onclick = function(){
      console.log(this);
      d3.selectAll('.browse-buttons .button')
        .classed('active', false);
      d3.select(this)
        .classed('active', true);
      RFFApp.controller.getCollectionItems(collection.data.key);
      RFFApp.controller.clearSearch();
    };
    
    return browseButton; 
  }
}

export const createTopicKey = function(){
  var cont = document.getElementById('browse-buttons-container');
  var html = `<div id="topic-key">
                  <div class="issue-brief">= issue brief and literature review available</div>
                  <div>= issue brief and literature review still to come</div>
              </div>`;
  cont.insertAdjacentHTML('beforeend', html);
}
