/**
 * 根据学习笔记 实现一次
 */
function createShader(gl, type, source) {
    // 创建着色器(顶点着色器 || 片元着色器)
    const shader = gl.createShader(type);
    // 将顶点着色文本关联到着色器上
    gl.shaderSource(shader,source);
    // 编译着色器
    gl.compileShader(shader);
    // 获取编译状态
    const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) {
        console.log(`--- createShader success ---`, success, type, shader);
        return shader;
    }

    // 打印出错信息 并删除
    console.log(gl.getShaderInfolog(shader));
    gl.deleteShader(shader);
}

// 定义函数来创建着色程序
function createProgram(gl, vertexShader, fragmentShader) {
    // 创建着色程序
    const program = gl.createProgram();
    // 让当前程序 绑定 顶点着色器 和 片元着色器
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    // 将两个着色器与着色程序绑定
    gl.linkProgram(program);
    // 判定一下绑定状态
    const success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (success) {
        console.log(`--- createProgram success ---`, success, program);
        return program;
    }

    // 打印出错信息 并删除
    console.log(gl.getProgramInfoLog(program));
    gl.deleteShader(program);
}

function main() {
    const image = new Image();
    // 如果是用 WebGL 中文文档上内置的运行环境编辑内容的，可以直接用网站内置的纹理图片。https://webglfundamentals.org/webgl/resources/leaves.jpg。
    // 由于我这里是自定义了本地的文件，因此创建了一个本地服务器来加载图片。使用本地文件的方式在文章末尾处。
    image.src = "http://192.168.70.151/fish5.png";
    image.onload = function() {
      render(image);
    };
}

function render(image) {
    const canvas = document.createElement('canvas');
    document.getElementsByTagName('body')[0].appendChild(canvas);
    canvas.width = 400;
    canvas.height = 300;

    const gl = canvas.getContext("webgl");
    if (!gl) {
        return;
    }

    const vertexShaderSource = `
    attribute vec2 a_position;
    // 纹理贴图 uv 坐标
    attribute vec2 a_uv;
    attribute vec4 a_color;
    varying vec4 v_color;
    varying vec2 v_uv;
    // 着色器入口函数
    void main() {
        v_color = a_color;
        v_uv = a_uv;
        gl_Position = vec4(a_position, 0.0, 1.0);
    }`;

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    // 让顶点的比例和图像比例一致
    const ratio = (image.width / image.height) / (canvas.width / canvas.height);
    const positions = [
        // -ratio, -1,
        // -ratio, 1,
        // ratio, -1,
        // ratio, 1
        0, 0, // 左下角
        0, 0.5, // 左上角
        0.5, 0, // 右下角
        0.5, 0.5 // 右上角
    ];
    
    const uvs = [
        0, 0, // 左下角
        0, 1, // 左上角
        1, 0, // 右下角
        1, 1 // 右上角
    ];

    // 在片元着色器文本处暂时屏蔽颜色带来的影响，但此处颜色值我们还是上传给顶点着色器
    const colors = [
        255, 0, 0, 255,
        0, 255, 255, 255,
        0, 0, 255, 255,
        255, 127, 0, 255
    ];

    const indices = [
        0, 1, 2,
        // 2, 1, 3 
    ];

    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

    const attribOffset = (positions.length + uvs.length) * Float32Array.BYTES_PER_ELEMENT + colors.length;
    const arrayBuffer = new ArrayBuffer(attribOffset);
    const float32Buffer = new Float32Array(arrayBuffer);
    const colorBuffer = new Uint8Array(arrayBuffer);
    // 当前顶点属性结构方式是 pos + uv + color
    // 按 float 32 分布 pos（2）+ uv（2） + color（1）
    // 按子节分布 pos（2x4） + uv（2x4） + color（4）
    let offset = 0;
    let i = 0;
    for (i = 0; i < positions.length; i += 2) {
        float32Buffer[offset] = positions[i];
        float32Buffer[offset + 1] = positions[i + 1];
        offset += 5;
    }

    offset = 2;
    for (i = 0; i < uvs.length; i += 2) {
        float32Buffer[offset] = uvs[i];
        float32Buffer[offset + 1] = uvs[i + 1];
        offset += 5;
    }

    offset = 16;
    for (let j = 0; j < colors.length; j += 4) {
        // 2 个 position 的 float，加 4 个 unit8，2x4 + 4 = 12
        // stride + offset
        colorBuffer[offset] = colors[j];
        colorBuffer[offset + 1] = colors[j + 1];
        colorBuffer[offset + 2] = colors[j + 2];
        colorBuffer[offset + 3] = colors[j + 3];
        offset += 20;
    }

    gl.bufferData(gl.ARRAY_BUFFER, arrayBuffer, gl.STATIC_DRAW);

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
    const fragmentShaderSource = `
    precision mediump float;
    varying vec2 v_uv;
    varying vec4 v_color;
    // GLSL 有一个供纹理对象使用的内建数据类型，叫做采样器(Sampler)，它以纹理类型作为后缀
    // 比如此处使用的是 2D 纹理，类型就定义为 sampler2D
    uniform sampler2D u_image;
    // 着色器入口函数
    void main() {
        // 使用 GLSL 内建函数 texture2D 采样纹理，它第一个参数是纹理采样器，第二个参数是对应的纹理坐标
        // 函数会使用之前设置的纹理参数对相应的颜色值进行采样，这个片段着色器的输出就是纹理的（插值）纹理坐标上的（过滤后的）颜色。
        gl_FragColor = texture2D(u_image, v_uv);
    }`;
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    const program = createProgram(gl, vertexShader, fragmentShader);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 255);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    const positionAttributeLocation = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionAttributeLocation);
    const uvAttributeLocation = gl.getAttribLocation(program, "a_uv");
    gl.enableVertexAttribArray(uvAttributeLocation);
    const colorAttributeLocation = gl.getAttribLocation(program, "a_color");
    gl.enableVertexAttribArray(colorAttributeLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 20, 0);
    // 新增顶点属性纹理坐标，这里大家应该都很清楚了，就不再多说了
    gl.vertexAttribPointer(uvAttributeLocation, 2, gl.FLOAT, false, 20, 8);
    gl.vertexAttribPointer(colorAttributeLocation, 4, gl.UNSIGNED_BYTE, true, 20, 16);
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    // 设置纹理的环绕方式
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    // 设置纹理的过滤方式
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    // gl.texImage2D(target, level, internalformat, format, type, HTMLImageElement? pixels);
    // 此接口主要为了指定二维纹理图像，图像的来源有多种，可以直接采用 HTMLCanvasElement、HTMLImageElement 或者 base64。此处选用最基础的 HTMLImageElement 讲解。
    // 关于参数的详细内容请参考：https://developer.mozilla.org/zh-CN/docs/Web/API/WebGLRenderingContext/texImage2D
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
}

// function main() {
//     // 加载图像
//     const image = new Image();
//     image.src = `http://192.168.70.151/fish5.png`;
//     image.onload = function() {
//         render(image);
//     }   
// }

// function render(image) {
    
//     // 1. 创建 body
//     document.body = document.createElement('body');
//     document.body.id = 'newBodyElement';

//     // 2. 创建画布 canvas, 设置画布长宽, 并添加到body
//     const canvas = document.createElement('canvas');
//     canvas.width = 400;
//     canvas.height = 300;
//     document.body.appendChild(canvas);

//     /*
//         3.获取 canvas 中的绘图上下文 gl // canvas.getContext('webgl2');
//             1). 开启面剔除(剔除背面,因为cocos 默认也是剔除背面) // gl.enable(gl.CULL_FACE);
//     */
//     const gl = canvas.getContext('webgl2');
//     gl.enable(gl.CULL_FACE);

//     /**
//      * 4. 开始编辑顶点着色器
// 		1). 定义一个着色器文本
// 		2). 创建顶点着色器
// 			- 创建着色器
// 			- 编译着色器
// 			- 获取编译状态(成功/失败, 如果失败, 打印失败信息并处理(删除))
//      */
//     const vertexSource = `
//         attribute vec2 a_position;
//         attribute vec2 a_uv;    // 定义纹理输入顶点
//         attribute vec4 a_color;

//         varying vec4 v_color;
//         varying vec2 v_uv;  // 定义纹理输出顶点

//         void main(){
//             v_color = a_color;
//             v_uv = a_uv;
//             gl_Position = vec4(a_position, 0.0, 1.0);
//         }
//     `;
//     const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);

//     // 5. 编写顶点数据

//     /*
//         扩展顶点属性, 设置顶点颜色的第二种方法
//         webgl 中可以获得顶点着色器中输入的三个颜色值
//         在光栅化的时候根据这三个值进行插值
//         也就是如果三角形每个顶点的颜色都不一样
//         那么 webgl 会在顶点a 和顶点 b 之间进行像素插值
//         所以接下来我们给顶点着色器传顶点颜色值
//         让他按照我们给的值进行绘制
//         1. 顶点属性要增加一个颜色输入 a_color, 同时增加一个输出 v_color , 为了给片元着色器
//         2. 在函数中进行赋值 v_color = v_color;
//         3. 在片元着色中 增加颜色输入 v_color, 并且赋值给 gl_FragColor
//     */

//     /*
//         顶点数据类型优化, 颜色分量使用uint 来表示
//         1. 创建一个大的缓冲 让 position 和 colors 共享这个缓冲
//         2. 新增一个缓冲让 position 和 colors 不共享同一个缓冲
//     */
//     // const positions = [
//     //     0.0,0.0,
//     //     0.5,0.0,
//     //     0.0,0.7,
//     //     0.5,0.7
//     // ];
//     /*
//         uv顶点信息
//     */
//    const vertexPosUv = [
//         0.0,0.0,0,0,    // 纹理左下角
//         0.5,0.0,1,0,    // 纹理右下角    
//         0.0,0.7,0,1,    // 纹理右上角        
//         0.5,0.7,1,1     // 纹理左上
//    ];

//     const colors =[
//         125, 80, 255, 255,
//         0, 0, 125, 255,
//         70, 0, 0, 255,
//         255, 0, 0, 255
//     ];

    
//     // 创建一个大的缓冲
//     // const arrayBuffer = new ArrayBuffer(positions.length*Float32Array.BYTES_PER_ELEMENT + colors.length);
//     // const positionsBuffer = new Float32Array(arrayBuffer);
//     // const colorsBuffer = new Uint8Array(arrayBuffer);
    
//     // 开始存顶点数据 positions
//     // 偏移量 代表在缓冲区中的存储位置
//     // let offset = 0; 
//     // // i+2 的原因是 一个位置有两个属性
//     // for (let i = 0; i < positions.length; i+=2) {
//     //     positionsBuffer[offset] = positions[i];
//     //     positionsBuffer[offset+1] = positions[i+1];
//     //     // 因为位置的分量 占两个float, 一个颜色分量占一个float, 所以这里是+=3
//     //     offset +=3;
//     // }

//     // 开始存颜色数据 colors
//     // 开始时, 偏移为8, 因为位置占了 两个float
//     // offset = 8;
//     // for (let index = 0; index < colors.length; index+=4) {
//     //     colorsBuffer[offset] = colors[index];
//     //     colorsBuffer[offset+1] = colors[index+1];
//     //     colorsBuffer[offset+2] = colors[index+2];
//     //     colorsBuffer[offset+3] = colors[index+3];
//     //     offset +=12;
//     // }

//     // 6. 创建顶点缓冲
//     const vertexBuffer = gl.createBuffer();

//     // 7. 绑定顶点缓冲
//     gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

//     // 8. 初始化顶点缓冲buffer	// gl.bufferData
//     gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexPosUv), gl.STATIC_DRAW);
//     // gl.bufferData(gl.ARRAY_BUFFER, arrayBuffer, gl.STATIC_DRAW);

//     const colorsBuffer = gl.createBuffer();
//     gl.bindBuffer(gl.ARRAY_BUFFER, colorsBuffer);
//     gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array(colors), gl.STATIC_DRAW);
    

//     // 9. 编写顶点索引
//     const vertexIndex = [
//         0,1,2,
//         2,1,3
//     ]

// 	// 10.创建索引缓冲
//     const indexBuffer = gl.createBuffer();

// 	// 11.绑定索引缓冲
//     gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indexBuffer);

// 	// 12.初始化索引缓冲buff
//     gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint8Array(vertexIndex), gl.STATIC_DRAW);

//     /**
//      * 13.开始编辑片元着色器
// 		1). 定义一个片元着色器文本
// 		2). 创建片元着色器
// 			- 创建着色器
// 			- 编译着色器
// 			- 获取编译状态(成功/失败, 如果失败, 打印失败信息并处理(删除))
//      */

//     /*
//         uniform 是一种从 CPU 中的应用向 GPU 中的着色器发送数据的方式
//         但 uniform 和顶点属性有点不同
//         uniform 是全局的
//         意味着每一个 uniform 变量在每个着色程序中他是独一无二的
//         可以被着色程序的任意着色器在任意阶段访问
//         并且 uniform 会始终保持他自身的值 除非他被重置或者更新
//     */
//     const fragmentSource = `
//     // 声明所有浮点型的精度
//     precision highp float;
//     // 让片元着色器 为所有的片元输出统一的颜色
//     // 通过uniform 方式来传递颜色
//     // uniform vec4 u_color;
//     uniform sampler2D mainTexture; // 定义一个2d 图像 uniform

//     varying vec4 v_color;
//     varying vec2 v_uv;  // 定义纹理输入顶点

//     void main(){
//         gl_FragColor = texture2D(mainTexture, v_uv)*v_color;
//     }`;
//     const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    
//     /**
//      * 	14.创建着色程序(将顶点着色器 和 片元着色器 绑定到 着色程序上)
//         1). 创建着色器
// 		2). 绑定着色程序
// 			- gl.attachShader(program, vertexShader);
// 			- gl.attachShader(program, fragmentShader);
// 		3). link 绑定的着色程序
// 			- gl.linkProgram(program);
// 			- 获取编译状态(成功/失败, 如果失败, 打印失败信息并处理(删除))
//      */
//     const program = createProgram(gl, vertexShader, fragmentShader);

//     // 15.创建视图窗口
//     gl.viewport(0,0, gl.canvas.width, gl.canvas.height);

// 	// 16.设置清除画布颜色
//     gl.clearColor(0,0,0,1);

// 	// 17.清除画布(由于最终呈现在屏幕上的颜色都要从颜色缓冲中读取,因此每次绘制的时候都要清除, 否则容易出现花屏现象)
//     gl.clear(gl.COLOR_BUFFER_BIT);

// 	// 28.启用着色程序
//     gl.useProgram(program);

//     // 19. 获取顶点位置属性在顶点着色器中的位置所以, 并激活
//     const positionAttribLocation = gl.getAttribLocation(program, 'a_position');
//     gl.enableVertexAttribArray(positionAttribLocation);
//     // 20. 重新将顶点缓冲绑定到 ARRAY_BUFFER 上, 以确保当前 ARRAY_BUFFER 使用的缓存是我要的顶点缓冲
//     // gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
//     // 21.告诉属性如何获取数据
//     gl.vertexAttribPointer(positionAttribLocation, 2, gl.FLOAT, false, 16, 0);

//     // 获取颜色属性的索引值
//     const uvAttribLocation = gl.getAttribLocation(program, 'a_uv');
//     gl.enableVertexAttribArray(uvAttribLocation);
//     gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
//     // 给颜色属性赋值
//     gl.vertexAttribPointer(uvAttribLocation, 2, gl.FLOAT, false, 16, 8);

//     // 获取颜色属性的索引值
//     const colorAttribLocation = gl.getAttribLocation(program, 'a_color');
//     gl.enableVertexAttribArray(colorAttribLocation);
//     gl.bindBuffer(gl.ARRAY_BUFFER, colorsBuffer);
//     // 给颜色属性赋值
//     gl.vertexAttribPointer(colorAttribLocation, 4, gl.UNSIGNED_BYTE, true, 0, 0);

//     // 创建一张图像的缓存
//     const texture = gl.createTexture();
//     // 绑定当前图像
//     gl.bindTexture(gl.TEXTURE_2D, texture);
//     // 设置纹理的环绕方式
//     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
//     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
//     // 设置纹理过滤方式
//     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
//     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
//     // 上传纹理图像
//     gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
//     // gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

//     // 22.开始渲染
//     gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_BYTE, 0);
// }
main();