import styles from './browse-buttons.scss';
console.log(styles);
export const createBrowseCategory = function(category, index){
  /* global d3, RFFApp */
  var categoryDiv = document.createElement('div');

  console.log(category);
  categoryDiv.innerHTML = `
    <h3>${category.data.name}</h3>
  `;
  var container = document.createElement('div');
  container.className = 'browse-buttons';
  category.children.sort((a,b) => d3.ascending(a.data.name, b.data.name)).forEach((d,i) => {
    container.appendChild(createBrowseButton(d,i));
  });
  categoryDiv.appendChild(container);
  console.log(categoryDiv);
  return categoryDiv;
    
  function createBrowseButton(collection, i){
    var childrenClasses = [];
    if ( collection.children ) {
     
      childrenClasses = collection.children.map(each => each.data.name.cleanString());
    }
    console.log(styles,childrenClasses);
    var parent = document.createElement('div');
    parent.innerHTML = `
    <div data-collection="${collection.key}" class="button button--secondary ${ childrenClasses.reduce((acc,cur) => acc + styles[cur] + ' ','')} ${ index === 0 && i === 0 ? 'active' : ''}">
      <span>${collection.data.name}</span>
    </div>`;

    var browseButton = parent.children[0]; 

    browseButton.onclick = function(){
      console.log(this);
      d3.selectAll('.browse-buttons .button')
        .classed(styles.active, false);
      d3.select(this)
        .classed(styles.active, true);
      RFFApp.controller.getCollectionItems(collection.data.key);
    };

    return browseButton; 
  }
}

export const createTopicKey = function(){
  var cont = document.getElementById('browse-buttons-container');
  var html = `<div id="${styles['topic-key']}">
                  <div class="${styles['issue-brief']}">= comprehensive coverage with issue brief and literature review</div>
                  <div>= partial coverage</div>
              </div>`;
  cont.insertAdjacentHTML('beforeend', html);
}
