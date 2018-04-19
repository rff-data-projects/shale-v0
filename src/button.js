import _ from 'lodash';
import printMe from './print.js';
import styles from './buttonStyles.scss';

export default function Button() {
  var element = document.createElement('div');
  var button = document.createElement('button');
  button.classList.add(styles.btn);
  element.innerHTML = _.join(['Hello', 'webpack!'], ' ');

  button.innerHTML = 'Click on this and check the console';
  button.onclick = printMe;

  
  element.appendChild(button);
  return element;
}