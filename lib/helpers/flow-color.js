"use strict";

var hashString = function(str) {
  /*jslint bitwise: true */
  var hash = 0;
  for(var i = 0; i < str.length; i += 1) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  console.log(hash);
  return hash;
};


module.exports = function stringToColor(str) {
  var colors = [
  '#1f77b4', '#aec7e8', '#ff7f0e', '#ffbb78',
  '#2ca02c', '#98df8a', '#d62728', '#ff9896',
  '#9467bd', '#c5b0d5', '#8c564b', '#c49c94',
  '#e377c2', '#f7b6d2', '#7f7f7f', '#c7c7c7',
  '#bcbd22', '#dbdb8d', '#17becf', '#9edae5'
  ];
  return colors[Math.abs(hashString(str) % colors.length)];
};
