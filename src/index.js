/* global module */
import Button from './button.js';
import './styles.scss';

function render(elem, container) {
    var obj = {
        elem,
        container
    };
    obj.container.appendChild(obj.elem);
}

(function renderButton() {
    var elem = Button(),
        container = document.body;

    render(elem, container);

    if (module.hot) {
        module.hot.accept(['./button.js'], () => {
            container.removeChild(elem);            
            elem = Button(); // Re-render the "component" to update the click handler
            render(elem,container);
        })
    }
})();