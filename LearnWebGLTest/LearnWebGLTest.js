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

function main(params) {
    
    // 1. 创建 body
    document.body = document.createElement('body');
    document.body.id = 'newBodyElement';

    // 2. 创建画布 canvas, 设置画布长宽, 并添加到body
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 300;
    document.body.appendChild(canvas);

    /*
        3.获取 canvas 中的绘图上下文 gl // canvas.getContext('webgl2');
            1). 开启面剔除(剔除背面,因为cocos 默认也是剔除背面) // gl.enable(gl.CULL_FACE);
    */
    const gl = canvas.getContext('webgl2');
    gl.enable(gl.CULL_FACE);

    /**
     * 4. 开始编辑顶点着色器
		1). 定义一个着色器文本
		2). 创建顶点着色器
			- 创建着色器
			- 编译着色器
			- 获取编译状态(成功/失败, 如果失败, 打印失败信息并处理(删除))
     */
    const vertexSource = `
        attribute vec2 a_position;
        void main(){
            gl_Position = vec4(a_position, 0.0, 1.0);
        }
    `;
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);

    // 5. 编写顶点数据
    const position = [
        0.0,0.0,
        0.5,0.0,
        0.0,0.7,
        0.5,0.7
    ];

    // 6. 创建顶点缓冲
    const vertexBuffer = gl.createBuffer();

    // 7. 绑定顶点缓冲
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

    // 8. 初始化顶点缓冲buffer	// gl.bufferData
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(position), gl.STATIC_DRAW);

    // 9. 编写顶点索引
    const vertexIndex = [
        0,1,2,
        2,1,3
    ]

	// 10.创建索引缓冲
    const indexBuffer = gl.createBuffer();

	// 11.绑定索引缓冲
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indexBuffer);

	// 12.初始化索引缓冲buff
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint8Array(vertexIndex), gl.STATIC_DRAW);

    /**
     * 13.开始编辑片元着色器
		1). 定义一个片元着色器文本
		2). 创建片元着色器
			- 创建着色器
			- 编译着色器
			- 获取编译状态(成功/失败, 如果失败, 打印失败信息并处理(删除))
     */

    /*
        uniform 是一种从 CPU 中的应用向 GPU 中的着色器发送数据的方式
        但 uniform 和顶点属性有点不同
        uniform 是全局的
        意味着每一个 uniform 变量在每个着色程序中他是独一无二的
        可以被着色程序的任意着色器在任意阶段访问
        并且 uniform 会始终保持他自身的值 除非他被重置或者更新
    */
    const fragmentSource = `
    // 声明所有浮点型的精度
    precision highp float;
    // 让片元着色器 为所有的片元输出统一的颜色
    // 通过uniform 方式来传递颜色
    uniform vec4 u_color;
    void main(){
        gl_FragColor = u_color;
    }`;
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    
    /**
     * 	14.创建着色程序(将顶点着色器 和 片元着色器 绑定到 着色程序上)
        1). 创建着色器
		2). 绑定着色程序
			- gl.attachShader(program, vertexShader);
			- gl.attachShader(program, fragmentShader);
		3). link 绑定的着色程序
			- gl.linkProgram(program);
			- 获取编译状态(成功/失败, 如果失败, 打印失败信息并处理(删除))
     */
    const program = createProgram(gl, vertexShader, fragmentShader);

    // 15.创建视图窗口
    gl.viewport(0,0, gl.canvas.width, gl.canvas.height);

	// 16.设置清除画布颜色
    gl.clearColor(0,0,0,1);

	// 17.清除画布(由于最终呈现在屏幕上的颜色都要从颜色缓冲中读取,因此每次绘制的时候都要清除, 否则容易出现花屏现象)
    gl.clear(gl.COLOR_BUFFER_BIT);

	// 28.启用着色程序
    gl.useProgram(program);

    // 19. 获取顶点位置属性在顶点着色器中的位置所以, 并激活
    const positionAttribLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionAttribLocation);

    // 获取 uniform 的顶点索引
    const vertexUniformLocation = gl.getUniformLocation(program, 'u_color');
    // 向 uniform u_color 传递数据
    // gl.uniform4f(vertexUniformLocation, 0.5,0.3,0.9,1.0);
    // 数组的形式
    gl.uniform4fv(vertexUniformLocation, [0.5,0.3,0.5,1.0]);

    // 20. 重新将顶点缓冲绑定到 ARRAY_BUFFER 上, 以确保当前 ARRAY_BUFFER 使用的缓存是我要的顶点缓冲
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

    // 21.告诉属性如何获取数据
    gl.vertexAttribPointer(positionAttribLocation, 2, gl.FLOAT, false, 0, 0);

    // 22.开始渲染
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_BYTE, 0);
}
main();