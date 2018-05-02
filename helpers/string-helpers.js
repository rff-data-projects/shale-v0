export const StringHelpers = (function(){
    String.prototype.cleanString = function() { // lowercase and remove punctuation and replace spaces with hyphens; delete punctuation
        return this.replace(/[ /]/g,'-').replace(/['"”’“‘,.!?;()&]/g,'').toLowerCase();
    };

    String.prototype.removeUnderscores = function() { 
        return this.replace(/_/g,' ');
    };

    String.prototype.undoCamelCase = function() {
        return this.replace(/([A-Z])/g, ' $1').toLowerCase();
    };

    String.prototype.trunc = String.prototype.trunc || // ht https://stackoverflow.com/a/1199420
         function( n, useWordBoundary ){
             if (this.length <= n) { return this; }
             var subString = this.substr(0, n-1);
             return (useWordBoundary 
                ? subString.substr(0, subString.lastIndexOf(' ')) 
                : subString) + "...";
          };
})();