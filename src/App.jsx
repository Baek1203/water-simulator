import { useState, useEffect, useRef } from 'react';

// 물병 모양 정의 (폭 계산 함수)
const SHAPES = {
  narrow_cylinder: { 
    id: 'narrow_cylinder', 
    name: '좁은 원기둥', 
    getW: () => 0.35,
    Icon: () => <rect x="9" y="4" width="6" height="16" fill="currentColor"/>
  },
  wide_cylinder: { 
    id: 'wide_cylinder', 
    name: '넓은 원기둥', 
    getW: () => 0.8,
    Icon: () => <rect x="4" y="4" width="16" height="16" fill="currentColor"/>
  },
  cone_up: { 
    id: 'cone_up', 
    name: '위로 좁아지는 모양', 
    getW: (y) => 0.85 - 0.55 * y,
    Icon: () => <polygon points="9,4 15,4 20,20 4,20" fill="currentColor"/>
  },
  cone_down: { 
    id: 'cone_down', 
    name: '위로 넓어지는 모양', 
    getW: (y) => 0.3 + 0.55 * y,
    Icon: () => <polygon points="4,4 20,4 15,20 9,20" fill="currentColor"/>
  },
  hourglass: { 
    id: 'hourglass', 
    name: '호리병', 
    getW: (y) => y <= 0.5 ? 0.85 - 1.1 * y : 0.3 + 1.1 * (y - 0.5),
    creaseY: 0.5,
    Icon: () => <polygon points="4,4 20,4 14,12 20,20 4,20 10,12" fill="currentColor"/>
  },
  flask: { 
    id: 'flask', 
    name: '삼각 플라스크', 
    getW: (y) => y > 0.5 ? 0.3 : 0.3 + 0.6 * ((0.5 - y) / 0.5),
    Icon: () => <polygon points="10,4 14,4 14,12 20,20 4,20 10,12" fill="currentColor"/>
  },
  step_up: { 
    id: 'step_up', 
    name: '아래가 넓은 계단형', 
    getW: (y) => y <= 0.5 ? 0.8 : 0.35,
    stepY: 0.5,
    Icon: () => <polygon points="4,20 20,20 20,12 15,12 15,4 9,4 9,12 4,12" fill="currentColor"/>
  },
  step_down: { 
    id: 'step_down', 
    name: '위가 넓은 계단형', 
    getW: (y) => y <= 0.5 ? 0.35 : 0.8,
    stepY: 0.5,
    Icon: () => <polygon points="9,20 15,20 15,12 20,12 20,4 4,4 4,12 9,12" fill="currentColor"/>
  }
};

export default function App() {
  const [selectedShape, setSelectedShape] = useState('wide_cylinder');
  const [isPlaying, setIsPlaying] = useState(false);
  
  const bottleCanvasRef = useRef(null);
  const graphCanvasRef = useRef(null);
  const requestRef = useRef(null);
  
  const simState = useRef({
    height: 0,
    volume: 0,
    isFilling: false,
    graphData: []
  });

  const MAX_VOLUME = 1.0; 
  const FILL_RATE = 0.005; 

  const drawBottle = () => {
    const canvas = bottleCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    const shape = SHAPES[selectedShape];
    const maxW = 220; 
    const h = 320; 
    const offsetX = width / 2;
    const offsetY = height - 40;
    
    const getEH = (w_pixel) => Math.max(w_pixel * 0.15, 2);
    const getX = (y, isLeft) => offsetX + (isLeft ? -1 : 1) * shape.getW(y) * maxW / 2;
    const getY = (y) => offsetY - y * h;

    const wBottom = shape.getW(0) * maxW / 2;
    const wTop = shape.getW(1) * maxW / 2;

    ctx.beginPath();
    ctx.ellipse(offsetX, offsetY + 2, wBottom + 10, getEH(wBottom) + 5, 0, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(offsetX, offsetY, wBottom, getEH(wBottom), 0, 0, Math.PI, true);
    ctx.strokeStyle = '#94a3b8'; 
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]); 
    ctx.stroke();
    
    if (shape.stepY) {
      const yStep = shape.stepY;
      const wTopStep = shape.getW(yStep + 0.01) * maxW / 2;
      const wBotStep = shape.getW(yStep - 0.01) * maxW / 2;
      
      if (shape.id === 'step_up') {
        ctx.beginPath();
        ctx.ellipse(offsetX, getY(yStep), wTopStep, getEH(wTopStep), 0, 0, Math.PI, true);
        ctx.stroke();
        
        ctx.setLineDash([]); 
        const angle = Math.acos(Math.min(1, wTopStep / wBotStep)); 
        
        ctx.beginPath();
        ctx.ellipse(offsetX, getY(yStep), wBotStep, getEH(wBotStep), 0, 0, angle, true);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.setLineDash([6, 4]);
        ctx.ellipse(offsetX, getY(yStep), wBotStep, getEH(wBotStep), 0, angle, Math.PI - angle, true);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.setLineDash([]);
        ctx.ellipse(offsetX, getY(yStep), wBotStep, getEH(wBotStep), 0, Math.PI - angle, Math.PI, true);
        ctx.stroke();
      } else if (shape.id === 'step_down') {
        ctx.beginPath();
        ctx.setLineDash([6, 4]);
        ctx.ellipse(offsetX, getY(yStep), wTopStep, getEH(wTopStep), 0, 0, Math.PI, true);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.ellipse(offsetX, getY(yStep), wBotStep, getEH(wBotStep), 0, 0, 2 * Math.PI, false);
        ctx.stroke();
      }
    }
    
    if (shape.creaseY) {
      const cY = shape.creaseY;
      const wC = shape.getW(cY) * maxW / 2;
      ctx.beginPath();
      ctx.setLineDash([6, 4]);
      ctx.ellipse(offsetX, getY(cY), wC, getEH(wC), 0, 0, Math.PI, true);
      ctx.stroke();
    }
    
    ctx.setLineDash([]); 

    if (simState.current.height > 0) {
      let segments = [];
      if (shape.stepY) {
        if (simState.current.height > shape.stepY) {
          segments.push({ bot: 0, top: shape.stepY, isStepBot: true });
          segments.push({ bot: shape.stepY, top: simState.current.height, isStepTop: true });
        } else {
          segments.push({ bot: 0, top: simState.current.height, isStepBot: true });
        }
      } else {
        segments.push({ bot: 0, top: simState.current.height });
      }

      const waterGradient = ctx.createLinearGradient(offsetX - maxW/2, offsetY, offsetX + maxW/2, offsetY);
      waterGradient.addColorStop(0, 'rgba(56, 189, 248, 0.85)');
      waterGradient.addColorStop(0.5, 'rgba(14, 165, 233, 0.7)');
      waterGradient.addColorStop(1, 'rgba(56, 189, 248, 0.85)');
      ctx.fillStyle = waterGradient;

      segments.forEach(seg => {
        const { bot, top, isStepBot, isStepTop } = seg;
        if (top <= bot) return;

        const getW = (y) => {
          if (isStepBot && y >= shape.stepY - 0.002) return shape.getW(shape.stepY - 0.002);
          if (isStepTop && y <= shape.stepY + 0.002) return shape.getW(shape.stepY + 0.002);
          return shape.getW(y);
        };

        const wB = getW(bot) * maxW / 2;
        const wT = getW(top) * maxW / 2;

        ctx.beginPath();
        ctx.moveTo(offsetX - wT, getY(top));
        for (let y = top; y >= bot; y -= 0.005) ctx.lineTo(offsetX - getW(y) * maxW / 2, getY(y));
        ctx.ellipse(offsetX, getY(bot), wB, getEH(wB), 0, Math.PI, 0, true);
        for (let y = bot; y <= top; y += 0.005) ctx.lineTo(offsetX + getW(y) * maxW / 2, getY(y));
        ctx.ellipse(offsetX, getY(top), wT, getEH(wT), 0, 0, Math.PI, true);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.ellipse(offsetX, getY(top), wT, getEH(wT), 0, 0, 2 * Math.PI);
        ctx.fill();
      });

      const currentH = simState.current.height;
      const getSurfaceW = (y) => {
        if (shape.stepY && y === shape.stepY) return shape.getW(y - 0.002);
        return shape.getW(y);
      };
      const wSurface = getSurfaceW(currentH) * maxW / 2;
      ctx.beginPath();
      ctx.ellipse(offsetX, getY(currentH), wSurface, getEH(wSurface), 0, 0, 2 * Math.PI);
      
      const surfaceGradient = ctx.createRadialGradient(offsetX, getY(currentH), 0, offsetX, getY(currentH), wSurface);
      surfaceGradient.addColorStop(0, 'rgba(224, 242, 254, 0.95)');
      surfaceGradient.addColorStop(1, 'rgba(125, 211, 252, 0.8)');
      ctx.fillStyle = surfaceGradient;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    const eps = 0.002;
    ctx.beginPath();
    
    if (shape.stepY) {
      ctx.moveTo(getX(1, true), getY(1));
      for (let y = 1; y >= shape.stepY + eps; y -= 0.005) ctx.lineTo(getX(y, true), getY(y));
      ctx.moveTo(getX(shape.stepY - eps, true), getY(shape.stepY - eps)); 
      for (let y = shape.stepY - eps; y >= 0; y -= 0.005) ctx.lineTo(getX(y, true), getY(y));
    } else {
      ctx.moveTo(getX(1, true), getY(1));
      for (let y = 1; y >= 0; y -= 0.005) ctx.lineTo(getX(y, true), getY(y));
    }
    
    ctx.ellipse(offsetX, offsetY, wBottom, getEH(wBottom), 0, Math.PI, 0, true);
    
    if (shape.stepY) {
      for (let y = 0; y <= shape.stepY - eps; y += 0.005) ctx.lineTo(getX(y, false), getY(y));
      ctx.moveTo(getX(shape.stepY + eps, false), getY(shape.stepY + eps)); 
      for (let y = shape.stepY + eps; y <= 1; y += 0.005) ctx.lineTo(getX(y, false), getY(y));
    } else {
      for (let y = 0; y <= 1; y += 0.005) ctx.lineTo(getX(y, false), getY(y));
    }
    
    ctx.strokeStyle = '#64748b'; 
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();

    if (shape.stepY) {
      const yStep = shape.stepY;
      const wTopStep = shape.getW(yStep + 0.01) * maxW / 2;
      const wBotStep = shape.getW(yStep - 0.01) * maxW / 2;
      
      ctx.beginPath();
      if (shape.id === 'step_up') {
        ctx.ellipse(offsetX, getY(yStep), wBotStep, getEH(wBotStep), 0, Math.PI, 0, true);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(offsetX, getY(yStep), wTopStep, getEH(wTopStep), 0, Math.PI, 0, true);
        ctx.stroke();
      } else if (shape.id === 'step_down') {
        ctx.ellipse(offsetX, getY(yStep), wTopStep, getEH(wTopStep), 0, Math.PI, 0, true);
        ctx.stroke();
      }
    }

    if (shape.creaseY) {
      const cY = shape.creaseY;
      const wC = shape.getW(cY) * maxW / 2;
      ctx.beginPath();
      ctx.ellipse(offsetX, getY(cY), wC, getEH(wC), 0, Math.PI, 0, true);
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.moveTo(getX(1, true), getY(1));
    for (let y = 1; y >= 0; y -= 0.005) {
      let yE = y;
      if (shape.stepY) {
        if (y >= shape.stepY - eps && y <= shape.stepY) yE = shape.stepY - eps;
        if (y <= shape.stepY + eps && y > shape.stepY) yE = shape.stepY + eps;
      }
      ctx.lineTo(offsetX - shape.getW(yE) * maxW / 2, getY(y));
    }
    ctx.ellipse(offsetX, offsetY, wBottom, getEH(wBottom), 0, Math.PI, 0, true);
    for (let y = 0; y <= 1; y += 0.005) {
      let yE = y;
      if (shape.stepY) {
        if (y >= shape.stepY - eps && y <= shape.stepY) yE = shape.stepY - eps;
        if (y <= shape.stepY + eps && y > shape.stepY) yE = shape.stepY + eps;
      }
      ctx.lineTo(offsetX + shape.getW(yE) * maxW / 2, getY(y));
    }
    ctx.ellipse(offsetX, getY(1), wTop, getEH(wTop), 0, 0, Math.PI, false);
    ctx.closePath();

    const frontGradient = ctx.createLinearGradient(offsetX - maxW/2, offsetY, offsetX + maxW/2, offsetY);
    frontGradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
    frontGradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.4)');
    frontGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
    frontGradient.addColorStop(0.8, 'rgba(255, 255, 255, 0.4)');
    frontGradient.addColorStop(1, 'rgba(255, 255, 255, 0.1)');
    ctx.fillStyle = frontGradient;
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(offsetX, getY(1), wTop, getEH(wTop), 0, 0, 2 * Math.PI);
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
    ctx.fill();

    ctx.beginPath();
    for (let y = 0.05; y <= 0.95; y += 0.01) {
      if (shape.stepY && Math.abs(y - shape.stepY) < eps) continue;
      let yE = y;
      if (shape.stepY) {
        if (y > shape.stepY) yE = Math.max(y, shape.stepY + eps);
        if (y < shape.stepY) yE = Math.min(y, shape.stepY - eps);
      }
      if (y === 0.05) ctx.moveTo(getX(yE, true) + 12, getY(yE));
      else ctx.lineTo(getX(yE, true) + 12, getY(yE));
    }
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.beginPath();
    for (let y = 0.05; y <= 0.95; y += 0.01) {
      if (shape.stepY && Math.abs(y - shape.stepY) < eps) continue;
      let yE = y;
      if (shape.stepY) {
        if (y > shape.stepY) yE = Math.max(y, shape.stepY + eps);
        if (y < shape.stepY) yE = Math.min(y, shape.stepY - eps);
      }
      if (y === 0.05) ctx.moveTo(getX(yE, false) - 12, getY(yE));
      else ctx.lineTo(getX(yE, false) - 12, getY(yE));
    }
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  const drawGraph = () => {
    const canvas = graphCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);

    const padLeft = 60;
    const padBottom = 60;
    const padTop = 40;
    const padRight = 40;
    const graphW = width - padLeft - padRight;
    const graphH = height - padBottom - padTop;

    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    for(let i=0; i<=5; i++) {
      ctx.beginPath();
      ctx.moveTo(padLeft, padTop + (graphH/5)*i);
      ctx.lineTo(width - padRight, padTop + (graphH/5)*i);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(padLeft + (graphW/5)*i, padTop);
      ctx.lineTo(padLeft + (graphW/5)*i, height - padBottom);
      ctx.stroke();
    }

    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padLeft, padTop - 10);
    ctx.lineTo(padLeft, height - padBottom);
    ctx.lineTo(width - padRight + 10, height - padBottom);
    ctx.stroke();

    ctx.fillStyle = '#334155';
    ctx.font = 'bold 14px "Malgun Gothic", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('시간 (일정하게 물을 채운 양)', width / 2 + 10, height - 20);
    
    ctx.save();
    ctx.translate(25, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('물의 높이', 0, 0);
    ctx.restore();

    ctx.font = '12px sans-serif';
    ctx.fillText('0', padLeft - 15, height - padBottom + 15);

    const data = simState.current.graphData;
    if (data.length > 0) {
      ctx.beginPath();
      ctx.moveTo(padLeft, height - padBottom);
      for (let i = 0; i < data.length; i++) {
        const pt = data[i];
        const x = padLeft + (pt.v / MAX_VOLUME) * graphW;
        const y = (height - padBottom) - (pt.h * graphH);
        ctx.lineTo(x, y);
      }
      ctx.strokeStyle = '#ef4444'; 
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = 'rgba(239, 68, 68, 0.4)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 4;
      ctx.stroke();
      ctx.shadowColor = 'transparent';
    }
  };

  const animate = () => {
    if (!simState.current.isFilling) return;

    const shape = SHAPES[selectedShape];
    const currentH = simState.current.height;
    
    if (currentH >= 1.0) {
      simState.current.isFilling = false;
      setIsPlaying(false);
      drawBottle();
      drawGraph();
      return;
    }

    const widthAtCurrentH = shape.getW(currentH);
    const dV = FILL_RATE;
    const dH = dV / widthAtCurrentH; 

    simState.current.height = Math.min(1.0, currentH + dH);
    simState.current.volume += dV;
    simState.current.graphData.push({ 
      v: simState.current.volume, 
      h: simState.current.height 
    });

    drawBottle();
    drawGraph();

    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (isPlaying) {
      simState.current.isFilling = true;
      requestRef.current = requestAnimationFrame(animate);
    } else {
      simState.current.isFilling = false;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, selectedShape]);

  useEffect(() => {
    handleReset();
  }, [selectedShape]);

  const handleReset = () => {
    setIsPlaying(false);
    simState.current = { height: 0, volume: 0, isFilling: false, graphData: [] };
    drawBottle();
    drawGraph();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-10 px-4 font-sans text-slate-800">
      
      <div className="max-w-5xl w-full flex items-center gap-3 mb-8">
        <div className="p-3 bg-blue-500 rounded-xl shadow-lg shadow-blue-200 text-white">
          <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12 18.75c-3.728 0-6.75-3.022-6.75-6.75s3.022-6.75 6.75-6.75 6.75 3.022 6.75 6.75-3.022 6.75-6.75 6.75z" />
          </svg>
        </div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">물병 모양에 따른 높이-시간 그래프</h1>
          <p className="text-slate-500 mt-1 font-medium">일정한 속도로 물을 채울 때, 물병의 폭에 따라 물의 높이가 어떻게 변하는지 관찰해 보세요.</p>
        </div>
      </div>

      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">물병 모양 선택</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.values(SHAPES).map((shape) => (
                <button
                  key={shape.id}
                  onClick={() => setSelectedShape(shape.id)}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-200 ${
                    selectedShape === shape.id 
                      ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' 
                      : 'border-slate-100 bg-white text-slate-500 hover:border-blue-200 hover:bg-slate-50'
                  }`}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" className="mb-2">
                    <shape.Icon />
                  </svg>
                  <span className="text-xs font-bold text-center leading-tight">{shape.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center">
            <canvas 
              ref={bottleCanvasRef} 
              width={350} 
              height={400} 
              className="w-full max-w-[300px] h-auto mb-6"
            />
            
            <div className="flex gap-4 w-full justify-center">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-bold text-white transition-all ${
                  isPlaying 
                    ? 'bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-200' 
                    : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200'
                }`}
              >
                {isPlaying ? (
                  <><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> 일시정지</>
                ) : (
                  <><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg> 물 채우기 시작</>
                )}
              </button>
              
              <button
                onClick={handleReset}
                className="flex items-center justify-center p-3 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                title="초기화"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">그래프 결과</h2>
          <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 rounded-xl border border-slate-100 p-4">
            <canvas 
              ref={graphCanvasRef} 
              width={600} 
              height={500} 
              className="w-full h-auto max-w-full rounded-lg bg-white shadow-sm"
            />
            
            <div className="mt-6 w-full bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-4 items-start">
              <div className="bg-blue-100 text-blue-600 p-1.5 rounded-full shrink-0 mt-0.5">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-blue-900 mb-1">선생님의 팁</h3>
                <p className="text-sm text-blue-800 leading-relaxed">
                  물병의 폭이 좁은 곳에서는 물의 높이가 <b>빠르게</b> 올라가고(그래프가 가파름), 
                  물병의 폭이 넓은 곳에서는 물의 높이가 <b>천천히</b> 올라갑니다(그래프가 완만함). 
                  <br className="hidden sm:block"/>모양을 바꿔가며 그래프가 구부러지는 모습을 비교해 보세요!
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}