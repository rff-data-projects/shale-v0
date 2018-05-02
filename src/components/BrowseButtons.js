export const createBrowseButton = function(collection, index){
  /* global d3, RFFApp */
  var childrenClass;
  if ( collection.children ) {
   
    childrenClass = collection.children.reduce((acc, cur) => acc + cur.data.name.cleanString() + ' ', '');
  }
  var parent = document.createElement('div');
  parent.innerHTML = `
  <div class="button button--secondary ${childrenClass} ${ index === 0 ? 'active' : ''}">
    <span>${collection.data.name}</span>
  </div>`;

  var browseButton = parent.children[0]; 

  browseButton.onclick = function(){
    console.log(this);
    d3.selectAll('#browse-buttons .button')
      .classed('active', false);
    d3.select(this)
      .classed('active', true);
    RFFApp.controller.getCollectionItems(collection.data.key);
  };

  return browseButton; 
}
