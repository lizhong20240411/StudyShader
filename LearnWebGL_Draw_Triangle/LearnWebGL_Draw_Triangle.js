/*
    本节学习目标
    1. 高效绘制多个三角形
        - 提供最优顶点
        - 指定绘制顺序, 
            * 我们把指定绘制顺序的方法称之为顶点索引
            * 对应了webgl上的索引缓冲对象 index buffer object(简称:IBO)
                1).标记出顶点的数组索引,有了索引后就可以清晰的定义三角形
                2).将数据提交给webgl 索引缓冲对象
                3).webgl就会按照索引顺序绘制顶点
                4).提交的顶点索引需要按照逆时针顺序提交, 这是因为一个物体通常有两个面
                    一个面面向我们,一个面看不见, 如果绘制两个面会导致资源浪费,
                    因此webgl会主动剔除背面 留下正面
                    这样在数据提交上 就有了一套规则
                    默认情况下, 逆时针定义的三角形为正面
                5). 之前是用gl.drawArrays的方式会绘制,如果用顶点索引的方式
                    就需要改用gl.drawElements 来绘制
                6).接下来尝试用索引缓冲对象来绘制两个三角形(矩形)
    2. 绘制不同颜色的三角形
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
    console.log(`---- shaderStudy ----`, params);

    // 创建画布
    const canvas = document.createElement('canvas');

    // 将创建的 canvas 添加为body的子元素
    const aNewBodyElement = document.createElement("body");
    aNewBodyElement.id = "newBodyElement";
    document.body = aNewBodyElement;
    document.body.appendChild(canvas);

    // 设置画布尺寸
    canvas.width = 400;
    canvas.height = 300;

    // 获取绘图上下文gl(webgl1 | webgl2)
    const gl = canvas.getContext('webgl2');

    // 判断当前浏览器是否支持webgl
    if (!gl) {
        console.log(`gl is null:`, gl);
        return;
    }

    // 开始编辑顶点着色器
    // 定义一个着色器文本
    const vertexSource = `
        attribute vec2 a_position;
        void main(){
            gl_Position = vec4(a_position, 0.0, 1.0);
        }
    `;

    // 创建顶点着色器
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
    // 用逆时针的方式提交顶点数据(012, 213)
    const position = [
        0.0,0.0,
        0.5,0.0,
        0.7,0.0,
        0.0,0.5,
        0.5,0.5,
        0.7,0.5
    ];

    /*
        开启面剔除
        剔除背面,因为cocos 默认也是剔除背面
    */
    gl.enable(gl.CULL_FACE);

    /*
        创建一个顶点缓冲对象
        在顶点着色器阶段会在GPU上创建内存 存储我们的顶点数据
        而顶点缓冲对象就是为了管理这个内存
        它会在GPU内存中存储大量的顶点
        使用这个缓冲对象的好处是我们可以一次性的发送一大批数据到显卡上
        而不是每个顶点发送一次
        从CPU把数据发送到GPU这个过程是比较慢的
        所以只要有可能我们都尽量尝试一次性发送尽可能多的数据
        当这个数据发送到GPU内存中之后
        顶点着色器几乎能够立即访问到这些顶点
        速度是非常快的
        顶点缓存对象的缓冲类型是gl.ARRAY_BUFFER
        webgl 允许我们同时绑定多个缓冲
        只要他们是不同的缓冲类型
        也就是说 想通类型后绑定的会替换之前绑定的
        然后我们再往ARRAY_BUFFER上传递顶点数据
        数据就会存储到绑定的顶点缓冲上
    */
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

    /*
        bufferData 主要初始化buffer 对象的数据存储
        1. 因为此时要给顶点缓冲传递数据, 所以选择的是 ARRAY_BUFFER 缓冲
        2. 第二个是设定buffer数据存储区的大小
            - GPU上的内存容量通常不会很大
            - 因此需要合理的分配内存
            - 这里就是为顶点位置数据分配字节数
            - 因为每一个顶点的分量都是浮点型
            - 因此这里申请采用float32位的浮点型数组存储数据
            - 一般针对浮点型数据 也就是32位字节存储
        3. usage 第三个参数, 提示webgl我们将如何使用这些数据
            - gl.STATIC_DRAW : 数据不会或几乎不会改变
            - gl.DYNAMIC_DRAW : 数据会改变很多,(如果动态更新, 通常用该方式)
            - gl.STREAM_DRAW : 数据在每次绘制时都会改变
    */
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(position), gl.STATIC_DRAW);

    // 定义顶点索引
    const vertexIndex = [
        0,2,3,
        0,5,3
    ]

    // 创建索引缓冲对象
    const indexBuffer = gl.createBuffer();
    // ELEMENT_ARRAY_BUFFER 专门用来绑定索引缓冲对象
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indexBuffer);
    /*
        因为buff 没有浮点数, 所以用uint 来存
    */
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint8Array(vertexIndex), gl.STATIC_DRAW);
    // 定义完成 索引缓冲之后 就修改绘制方式 使用gl.drawElements


    // 定义片元着色器
    // 定义片元着色器的着色文本
    fragmentSource = `
        // 声明所有浮点型的精度
        precision highp float;
        // 让片元着色器 为所有的片元输出统一的颜色
        void main(){
            gl_FragColor = vec4(1, 0.5, 0.2, 1.0);
        }
    `;

    // 创建片元着色器
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    // 将 顶点着色器 和 片元着色器 绑定到着色程序上
    // 创建着色程序
    const program = createProgram(gl, vertexShader, fragmentShader);
    /*
        到这里为止 已经把输入的顶点数据发送给了GPU
        并指示GPU 如何在顶点着色器中处理它
        就快完成 但还没有结束
        目前为止 webgl 还不知道如何解析 内存中的顶点数据
        也就是如何将顶点数据链接到顶点着色器的属性上
        我们需要告诉webgl 怎么做

        顶点着色器有个特性
        就是允许指定任何以顶点属性为形式的输入
        既一个顶点可以包含多个属性
        比如我们这里的位置属性
        这种形式的输入为我们在数据组织上提供了很大的灵活性
    */

    // 解析顶点数据

    /*
        设置视图窗口
        方便在屏幕映射时将 NDC 坐标转换到屏幕坐标
        屏幕映射得到的屏幕坐标决定了这个顶点对应屏幕上哪个像素
        最终这些值都会交给光栅器处理
        同时还要清除画布颜色和颜色缓冲
        也可以直接将画布颜色设置成透明
    */
    gl.viewport(0,0, gl.canvas.width, gl.canvas.height);
    // 清除画布颜色
    gl.clearColor(0,0,0,1);

    /*
        由于最终呈现在屏幕上的颜色都要从颜色缓冲中读取
        因此每次绘制的时候都要清除, 否则容易出现花屏现象
    */
   gl.clear(gl.COLOR_BUFFER_BIT);

   /*
        接下来启用着色程序
        每次绘制之前都要启动指定的着色程序
   */
   gl.useProgram(program);
   
   /*
        再往下获取顶点位置属性在顶点着色器中的位置索引
        这个索引号引用到了GPU维护的属性列表中
        因此每次对属性进行操作都要激活属性
   */
   const positionAttribLocation = gl.getAttribLocation(program, 'a_position');
   gl.enableVertexAttribArray(positionAttribLocation);

   /*
        重新将顶点缓冲绑定到 ARRAY_BUFFER 上
        以确保当前 ARRAY_BUFFER 使用的缓存是我要的顶点缓冲
   */
   gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

   /*
        告诉属性如何获取数据
        1. index,代表获取顶点着色器上指定属性的位置, 这里已经获取到 a_position 的位置
        2. size, 代表当前一个顶点数据要取的数据长度
            - 这里为每一个顶点提交的都是二维坐标 因此数量是2
        3. type,数据缓存类型
            - 这里用的是float32位浮点型 因此这里使用的是 gl.FLOAT
            - 告诉webgl 当前的数据类型是浮点型
        4. normalize,决定数据是否要归一化
            - 因为这里已经提供的就是裁剪坐标, 所以不归一化
        5. stride,代表数据存储的方式,单位是字节
            - 0 表示数据是连续存放的, 通常在只有一个属性的数据里这么用, 比如我们当前提交的顶点数据只有顶点位置
            - 非0 则表示用一个属性在数据中的间隔大小, 可以理解为步长
        6. offset, 表示的数下载缓冲区中每间隔的偏移值,单位是字节
            - 因为这里的是连续的数据,所以这里偏移值还是0
   */
   gl.vertexAttribPointer(positionAttribLocation, 2, gl.FLOAT, false, 0, 0);
   
   /*
        设置完顶点属性后, 接下来就可以渲染了
        调用绘图接口
        1. 模式, 代表我们可以绘制的到底是点,是线还是面
        2. 从哪个点开始,默认是0
        3. 绘制多少个顶点, 因为现在是三角形, 所以需要3个顶点
   */
   // gl.drawArrays(gl.TRIANGLES, 0, 3);


   /*
        1. 模式, 代表我们可以绘制的到底是点,是线还是面
        2. 绘制的数量 6
        3. 元素数组缓冲区中的值的类型, 因为这里使用的是uint8, 所以使用gl.UNSIGNED_BYTE
        4. 数据偏移量
   */
   gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_BYTE, 0);
}
main();