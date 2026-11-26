/* 启动 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', IS.init);
} else {
  IS.init();
}
