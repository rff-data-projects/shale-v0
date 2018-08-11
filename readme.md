# SHARC — Shale Research Clearinghouse

SHARC is a publicly accessible, curated clearinghouse for publications on the economic, health, and environmental impacts of oil and gas development.

The publications are housed in a [public Zotero group](https://www.zotero.org/groups/2127948/sharc/) managed by RFF researchers. SHARC ingests, displays, manipulates, and adds to the information in the Zotero database, providing and informative and user-friendly view into its contents.

The collection highlights issue briefs and literature reviews summarizing the works included in each topic area.

## About the code

SHARC is written in framework-less ES6 JavaScript compiled and transpiled through Webpack. The Zotero data comes in via [Zotero's API (v3)](https://www.zotero.org/support/dev/web_api/v3/start).

Some of the code is fully modularized, with the HTML, JS, and SCSS of the components housed in separate folders and `import`ed into index.js. Some of it is handled directly in index.js, and a variety of methods for creating views and manipulating them is used. Porting an earlier version from a Grunt-based workflow to Webpack accounts for some of the inconsistencies.

## To edit

1. [Install npm](https://www.npmjs.com/get-npm)
1. Clone the repository.
1. Run `npm install` in the directory of your repository to install Webpack and other dev dependencies
1. Run `npm run start` to start Webpack's dev server. Some edits will show in your browser immediately via Webpack's [Hot Module Replacement](https://webpack.js.org/concepts/hot-module-replacement/); others will require manual refresh because of the inconsistencies mentioned above.

## To deploy

1. Run `npm run build` to emit build files to the dist/ folder
1. The live code exists inline in the body of a page on RFF's site
1. To edit the live page, cut and paste css/styles.css and js,index.js and the relevant bits of index.html into the right places in the content body. Existing page content is commented to make this clear.

The app works on its own but is not fully designed until it is part of an RFF page. Global changes to the website will affect the display of this app.

**Note that the page's layout has been changed from two-column default to single-column**