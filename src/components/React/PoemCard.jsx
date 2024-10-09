import React from 'react';

const PoemCard = ({
  poemTitle = "诗题",
  poemContent = "这是一首诗的内容请替换这里的文字",
  poet = "作者",
  columns = 4,
  styles = {
    backgroundColor: "#f5e6d3",
    textColor: "#8b4513",
    borderColor: "#8b4513",
    titleFontSize: 16,
    textFontSize: 14,
    fontFamily: "SimSun, serif"
  }
}) => {
  const contentArray = [];
  const charsPerColumn = Math.ceil(poemContent.length / columns);
  
  for (let i = 0; i < poemContent.length; i += charsPerColumn) {
    contentArray.push(poemContent.slice(i, i + charsPerColumn));
  }
  
  return (
    <div className="flex justify-center items-center">
      <svg viewBox="0 0 200 280" className="w-full max-w-[200px]">
        {/* 背景 */}
        <rect width="200" height="280" fill={styles.backgroundColor}/>
        
        {/* 装饰性边框 */}
        <g fill="none" stroke={styles.borderColor}>
          {/* 基础边框 */}
          <rect x="10" y="10" width="180" height="260" strokeWidth="1.5"/>
          
          {/* 角落装饰 */}
          {/* 左上角 */}
          <path d="M10,30 Q15,30 15,25 V15 Q15,10 20,10" strokeWidth="1"/>
          <path d="M10,25 L20,25 M25,10 L25,20" strokeWidth="0.8"/>
          
          {/* 右上角 */}
          <path d="M190,30 Q185,30 185,25 V15 Q185,10 180,10" strokeWidth="1"/>
          <path d="M190,25 L180,25 M175,10 L175,20" strokeWidth="0.8"/>
          
          {/* 左下角 */}
          <path d="M10,250 Q15,250 15,255 V265 Q15,270 20,270" strokeWidth="1"/>
          <path d="M10,255 L20,255 M25,270 L25,260" strokeWidth="0.8"/>
          
          {/* 右下角 */}
          <path d="M190,250 Q185,250 185,255 V265 Q185,270 180,270" strokeWidth="1"/>
          <path d="M190,255 L180,255 M175,270 L175,260" strokeWidth="0.8"/>
          
          {/* 边框中间装饰 */}
          <path d="M95,10 L105,10 M95,270 L105,270" strokeWidth="1"/>
          <path d="M10,135 L10,145 M190,135 L190,145" strokeWidth="1"/>
        </g>
        
        {/* 标题和作者 */}
        <text x="170" y="40" fill={styles.textColor} fontFamily={styles.fontFamily} 
              fontSize={styles.titleFontSize} writingMode="tb">{poemTitle}</text>
        <text x="170" y="130" fill={styles.textColor} fontFamily={styles.fontFamily} 
              fontSize={styles.textFontSize} writingMode="tb">【{poet}】</text>
        
        {/* 诗句 */}
        {contentArray.map((column, index) => (
          <text 
            key={index} 
            x={145 - index * 28}
            y="35" 
            fill={styles.textColor} 
            fontFamily={styles.fontFamily} 
            fontSize={styles.textFontSize} 
            writingMode="tb"
          >
            {column}
          </text>
        ))}
      </svg>
    </div>
  );
};

export default PoemCard;
