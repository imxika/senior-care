// Hydration 에러 체크 스크립트
// 브라우저 콘솔에서 실행하여 어떤 컴포넌트에서 에러가 발생하는지 확인

console.log('🔍 Hydration 에러 체크 시작...');

// React DevTools 확인
if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
  console.log('✅ React DevTools 감지됨');
} else {
  console.log('⚠️  React DevTools가 설치되지 않았습니다');
}

// 에러 리스너 추가
const originalError = console.error;
const hydrationErrors = [];

console.error = function(...args) {
  const errorMessage = args.join(' ');

  if (errorMessage.includes('Hydration') ||
      errorMessage.includes('did not match') ||
      errorMessage.includes('server rendered HTML')) {
    hydrationErrors.push({
      timestamp: new Date().toISOString(),
      message: errorMessage,
      stack: new Error().stack
    });
    console.log('🚨 Hydration 에러 감지:', errorMessage);
  }

  originalError.apply(console, args);
};

// 결과 출력 함수
window.checkHydrationErrors = function() {
  if (hydrationErrors.length === 0) {
    console.log('✅ Hydration 에러 없음');
  } else {
    console.log(`🚨 총 ${hydrationErrors.length}개의 Hydration 에러 발견:`);
    hydrationErrors.forEach((error, index) => {
      console.log(`\n에러 #${index + 1}:`, error.message);
    });
  }
  return hydrationErrors;
};

console.log('✅ 체크 준비 완료. window.checkHydrationErrors() 로 결과 확인');
