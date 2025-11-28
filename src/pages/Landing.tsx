import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles, Users, Zap, Brain, Target, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Landing: React.FC = () => {
  const { signInWithGoogle, currentUser } = useAuth();
  const navigate = useNavigate();

  // 로그인된 사용자는 대시보드로 리다이렉트
  useEffect(() => {
    if (currentUser) {
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
      // 로그인 성공 시 useEffect가 자동으로 대시보드로 이동
    } catch (error) {
      console.error('로그인 실패:', error);
      alert('로그인에 실패했습니다. 다시 시도해주세요.');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="neo-section bg-yellow-400 border-b-4 border-black relative overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10">
          {/* Main Content */}
          <div className="text-center space-y-8">
            <div className="inline-block px-6 py-2 bg-black text-yellow-400 border-2 border-black shadow-neo font-bold rotate-[-2deg]">
              <span className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                AI로 똑똑하게 반 배정!
              </span>
            </div>

            <h1 className="neo-heading-xl leading-tight">
              학급 편성,
              <br />
              <span className="text-black">이제는 AI와 함께!</span>
            </h1>

            <p className="text-xl md:text-2xl font-semibold max-w-2xl mx-auto">
              복잡한 조건도 한 번에!
              <br className="md:hidden" />
              Gemini AI가 최적의 반 배정을 추천합니다
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={handleSignIn}
                className="neo-btn neo-btn-primary text-lg group"
              >
                <span className="flex items-center gap-2">
                  Google로 시작하기
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </button>

              <button className="neo-btn-secondary text-lg">
                둘러보기
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto pt-8">
              {[
                { label: '사용자', value: '1,000+' },
                { label: '배정 완료', value: '5,000+' },
                { label: '만족도', value: '98%' }
              ].map((stat, idx) => (
                <div key={idx} className="neo-card bg-white text-center">
                  <div className="neo-heading-md">{stat.value}</div>
                  <div className="font-bold text-gray-700">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Decorative Elements */}
          <div className="absolute top-10 left-10 w-20 h-20 bg-pink-400 border-2 border-black rotate-12 opacity-50"></div>
          <div className="absolute bottom-10 right-10 w-32 h-32 bg-cyan-400 border-2 border-black rounded-full opacity-50"></div>
        </div>
      </section>

      {/* Features Section */}
      <section className="neo-section bg-cyan-400 border-b-4 border-black">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="neo-heading-lg mb-4">왜 GoodBye!인가요?</h2>
            <p className="text-xl font-semibold">3가지 핵심 기능으로 완벽한 반 배정을 실현합니다</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Brain className="w-12 h-12" />,
                title: 'AI 추천',
                description: 'Gemini AI가 최적의 배정 방법을 제안합니다',
                color: 'bg-pink-400'
              },
              {
                icon: <Users className="w-12 h-12" />,
                title: '실시간 협업',
                description: 'Firebase로 언제 어디서나 팀과 함께 작업하세요',
                color: 'bg-yellow-400'
              },
              {
                icon: <Zap className="w-12 h-12" />,
                title: '자동 균형',
                description: '성비, 특수학급 등 모든 조건을 자동으로 맞춥니다',
                color: 'bg-lime-400'
              }
            ].map((feature, idx) => (
              <div
                key={idx}
                className={`neo-card-hover ${feature.color} rotate-${(idx % 2) ? '1' : '-1'}`}
              >
                <div className="mb-4">{feature.icon}</div>
                <h3 className="neo-heading-sm mb-2">{feature.title}</h3>
                <p className="font-semibold">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="neo-section bg-pink-400 border-b-4 border-black">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="neo-heading-lg mb-4">5단계로 완성하는 완벽한 반 배정</h2>
            <p className="text-xl font-semibold">간단하지만 강력한 워크플로우</p>
          </div>

          <div className="space-y-6">
            {[
              { step: '1', title: '기본 설정 & 명단', desc: '학년, 반 수, 학생 정보를 입력하세요' },
              { step: '2', title: '비고 입력', desc: '특수학급, 학습부진 등 상세 정보를 추가하세요' },
              { step: '3', title: '분리/통합 요청', desc: '학생 간 분리 또는 통합이 필요한 경우를 지정하세요' },
              { step: '4', title: '배정 설정', desc: 'AI 추천을 받거나 직접 배정 방법을 선택하세요' },
              { step: '5', title: '결과 확인', desc: '최종 결과를 확인하고 Excel/PDF로 내보내세요' }
            ].map((item, idx) => (
              <div key={idx} className="flex items-start gap-6">
                <div className="neo-card bg-black text-yellow-400 text-center flex-shrink-0 w-20 h-20 flex items-center justify-center">
                  <span className="font-black text-4xl">{item.step}</span>
                </div>
                <div className="neo-card bg-white flex-1">
                  <h3 className="neo-heading-sm mb-2">{item.title}</h3>
                  <p className="font-semibold text-gray-700">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="neo-section bg-lime-400 border-b-4 border-black">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="neo-heading-lg mb-4">선생님들의 후기</h2>
            <p className="text-xl font-semibold">실제 사용자들의 생생한 경험담</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: '김교사',
                school: '서울 ㅇㅇ초등학교',
                comment: '매년 골치아팠던 반 배정이 이제는 10분이면 끝나요!',
                color: 'bg-yellow-400'
              },
              {
                name: '이선생',
                school: '경기 ㅁㅁ중학교',
                comment: 'AI 추천 기능 덕분에 학부모 민원이 현저히 줄었습니다',
                color: 'bg-cyan-400'
              },
              {
                name: '박담임',
                school: '부산 ㅂㅂ고등학교',
                comment: '복잡한 조건도 한 번에 해결! 정말 편리해요',
                color: 'bg-pink-400'
              }
            ].map((testimonial, idx) => (
              <div key={idx} className={`neo-card ${testimonial.color}`}>
                <div className="text-6xl mb-4">"</div>
                <p className="font-bold text-lg mb-4">{testimonial.comment}</p>
                <div className="border-t-2 border-black pt-4">
                  <p className="font-black">{testimonial.name}</p>
                  <p className="font-semibold text-sm">{testimonial.school}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="neo-section bg-orange-400 border-b-4 border-black">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className="neo-heading-lg">지금 시작하세요!</h2>
          <p className="text-2xl font-bold">
            무료로 시작하고, 스마트하게 반 배정하세요
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleSignIn}
              className="neo-btn neo-btn-primary text-xl group"
            >
              <span className="flex items-center gap-2">
                <Target className="w-6 h-6" />
                Google로 무료 시작
                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </span>
            </button>
          </div>

          <div className="flex items-center justify-center gap-8 pt-8">
            {[
              '무료 체험',
              '카드 필요 없음',
              '언제든 시작'
            ].map((text, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                <span className="font-bold">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="neo-section bg-black text-white">
        <div className="max-w-7xl mx-auto text-center">
          <p className="font-bold text-lg mb-2">GoodBye!</p>
          <p className="font-semibold">Made with ❤️ for Teachers</p>
          <p className="text-sm mt-4 opacity-75">© 2025 All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
