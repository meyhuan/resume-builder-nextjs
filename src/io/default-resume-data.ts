import type { ExternalResume } from './external-resume-types'

/**
 * 默认的新建简历初始内容 (空模板，带引导文字)
 */
export const BLANK_RESUME_JSON: ExternalResume = {
  base_info: {
    name: '姓名',
    gender: '性别',
    age: '年龄',
    birthday: '',
    show_age_type: 1,
    phone: '电话号码',
    mail: '邮箱',
    url: '',
    nation: '',
    hide_avatar: false,
    politics_status: '',
    height: '',
    weight: '',
  },
  job_intention: {
    objective: '求职岗位',
    category: '',
    industry: '',
    curr_salary: '',
    workyear_age: '',
    location: '意向城市',
    home_location: '',
    current_state: '',
    hope: '期望薪资',
    hope_industry: '',
    city: '意向城市',
    type: '求职类型',
    salary: '期望薪资',
    apply: 0,
    is_hide: false,
  },
  experience: [
    {
      id: 'default-exp-1',
      name: '公司名称',
      category: '',
      industry: '行业',
      position: '职位名称',
      work_place: '',
      month_salary: '月薪',
      work_industry: '',
      content: '<p>详细描述你的职责范围、工作内容和工作成果。最新的工作经验放在最前，描述尽量简洁，尽量写与职位匹配的内容，将有助于HR第一时间发现你的亮点。如果是知名企业，可以在工作内容的第一句话加上简短的公司或主要产品介绍，尽可能用数字说明成绩，突出分析能力、团队协作能力、解决问题的能力等工作上所需的专业素质。</p>',
      is_hide: false,
      period: {
        start: '开始时间',
        end: '结束时间',
      },
    },
  ],
  education: [
    {
      id: 'default-edu-1',
      name: '学校名称',
      major: '专业',
      degree: '学历',
      is_hide: false,
      recruit_type: '统招',
      course: '<p>大学之前的教育经历建议不写，尽量写与求职行业或者求职岗位相关的课程，有交流交换的经验可以在教育经历中展示。工作年限较多或成绩自认不够优异，则可以直接将教育背景清晰罗列后，重点丰富其他模块。成绩优异的话建议写上GPA及排名等信息，尽量简洁。</p>',
      period: {
        start: '开始时间',
        end: '结束时间',
      },
      content: '',
    },
  ],
  program_experience: [
    {
      id: 'default-proj-1',
      name: '项目名称',
      role: '项目角色',
      category: '',
      content: '<p>描述你参与过的项目及你在项目过程中所作的工作，内容简洁清晰，突出于求职岗位匹配的重点。具体可以从以下几个方面入手：1、项目内容；2、工作内容；3、项目成果。</p>',
      is_hide: false,
      period: {
        start: '开始时间',
        end: '结束时间',
      },
    },
  ],
  self_evaluation: {
    content: '<p>篇幅不要太长，注意结合简历整体的美观度，内容中应总结经验和特长，突出符合求职岗位职位描述的特点，避免使用过多形容词。例：拥有良好的沟通和协调能力，善于应变，能够快速适应新环境，熟悉使用办公软件，对文件管理十分熟悉。</p>',
    is_hide: false,
  },
  intern: [],
  school_exps: [],
  skills: {
    content: '',
    is_hide: true,
  },
  qualifications: {
    content: '',
    is_hide: true,
  },
  custom_module_info: [],
}

/**
 * 测试数据 (包含完整简历示例)
 */
export const TEST_RESUME_JSON: ExternalResume = {
  base_info: {
    name: '张明',
    gender: '男',
    age: '28',
    birthday: '1996.03.15',
    show_age_type: 1,
    phone: '138****8888',
    mail: 'zhangming@example.com',
    url: '',
    nation: '',
    hide_avatar: false,
    politics_status: '',
    height: '',
    weight: '',
  },
  job_intention: {
    objective: '前端开发工程师',
    category: '',
    industry: '',
    curr_salary: '',
    workyear_age: '',
    location: '',
    home_location: '',
    current_state: '',
    hope: '',
    hope_industry: '',
    city: '北京',
    type: '全职',
    salary: '15K-25K',
    apply: 0,
    is_hide: false,
  },
  experience: [
    {
      id: 'test-exp-1',
      name: '科技互联网公司',
      category: '',
      industry: '互联网',
      position: '前端开发工程师',
      work_place: '',
      month_salary: '',
      work_industry: '',
      content: '<ul><li>负责公司核心产品的前端开发工作，使用React、TypeScript等技术栈</li><li>参与项目架构设计，推动组件库建设，提升开发效率20%</li><li>优化页面性能，通过代码分割和懒加载将首屏加载时间缩短40%</li><li>与产品、设计团队紧密协作，按时保质完成项目需求</li></ul>',
      is_hide: false,
      period: {
        start: '2022.07',
        end: '至今',
      },
    },
    {
      id: 'test-exp-2',
      name: '软件开发公司',
      category: '',
      industry: '软件',
      position: '前端工程师',
      work_place: '',
      month_salary: '',
      work_industry: '',
      content: '<ul><li>负责企业级管理系统的前端开发和维护</li><li>使用Vue.js框架完成多个业务模块的开发</li><li>参与代码审查，保证代码质量和规范性</li><li>协助新人熟悉项目和技术栈</li></ul>',
      is_hide: false,
      period: {
        start: '2020.07',
        end: '2022.06',
      },
    },
  ],
  intern: [
    {
      id: 'test-intern-1',
      name: '互联网科技公司',
      category: '',
      industry: '互联网',
      position: '前端开发实习生',
      work_place: '',
      month_salary: '',
      work_industry: '',
      content: '<ul><li>参与公司产品的前端页面开发，熟悉React框架和组件化开发</li><li>协助完成移动端H5页面的适配工作</li><li>学习并实践前端工程化和性能优化知识</li><li>参与团队代码评审，提升代码质量</li></ul>',
      is_hide: false,
      period: {
        start: '2019.07',
        end: '2020.01',
      },
    },
  ],
  education: [
    {
      id: 'test-edu-1',
      name: '北京大学',
      major: '计算机科学与技术',
      degree: '本科',
      is_hide: false,
      recruit_type: '统招',
      course: '<p>主修课程：数据结构与算法、计算机网络、数据库系统、软件工程、Web开发技术等。GPA 3.6/4.0，获得校级奖学金。</p>',
      period: {
        start: '2016.09',
        end: '2020.06',
      },
      content: '',
    },
  ],
  program_experience: [
    {
      id: 'test-proj-1',
      name: '企业级管理后台系统',
      role: '前端负责人',
      category: '',
      content: '<p><strong>项目介绍：</strong>一个面向企业的综合管理后台系统，包含用户管理、权限控制、数据统计等功能模块。</p><p><strong>项目职责：</strong></p><ul><li>负责项目前端架构设计，采用React + TypeScript + Ant Design技术栈</li><li>实现可复用的业务组件库，提升开发效率30%</li><li>负责权限管理和路由控制模块的开发</li><li>优化页面性能，通过虚拟列表和懒加载提升大数据量场景下的渲染性能</li></ul>',
      is_hide: false,
      period: {
        start: '2022.07',
        end: '至今',
      },
    },
    {
      id: 'test-proj-2',
      name: '电商小程序',
      role: '前端开发',
      category: '',
      content: '<p><strong>项目介绍：</strong>开发一款微信小程序电商平台，包含商品展示、购物车、订单管理等功能。</p><p><strong>项目职责：</strong></p><ul><li>使用微信小程序原生开发，实现页面渲染和交互逻辑</li><li>接入微信支付功能，完成订单流程开发</li><li>优化小程序加载性能，将首屏时间缩短到50%</li><li>处理各种异常场景，提升用户体验</li></ul>',
      is_hide: false,
      period: {
        start: '2021.03',
        end: '2021.12',
      },
    },
  ],
  school_exps: [
    {
      id: 'test-campus-1',
      name: '学生会技术部',
      position: '部长',
      content: '<ul><li>负责组织学院技术讲座和编程培训，提升同学们的技术水平</li><li>策划并举办校园Web开发大赛，吸引全校近百名同学参加</li><li>带领团队开发校园信息门户网站，服务全校师生</li><li>协助组织各类学院活动，促进学院文化建设</li></ul>',
      is_hide: false,
      period: {
        start: '2018.09',
        end: '2020.06',
      },
    },
  ],
  self_evaluation: {
    content: '<p>5年前端开发经验，熟练掌握React、Vue等主流框架，具备扎实的JavaScript/TypeScript基础和良好的编程习惯。熟悉前端工程化和性能优化，有丰富的项目实战经验。具有良好的沟通能力、团队协作能力和学习能力，能够独立负责项目前端架构设计与开发。热爱技术，关注前端技术发展趋势，乐于在团队中分享技术经验。工作态度认真负责，善于思考和解决问题，对前端开发充满热情。</p>',
    is_hide: false,
  },
  skills: {
    content: '<ul><li>精通JavaScript/TypeScript，熟练使用ES6+语法特性</li><li>熟练掌握React、Vue等主流前端框架，了解框架原理和最佳实践</li><li>熟悉前端工程化，掌握Webpack、Vite等构建工具的配置和优化</li><li>熟悉HTML5、CSS3，能够实现复杂的页面布局和动画效果</li><li>了解Node.js，能够进行简单的后端开发和接口对接</li><li>熟悉常用设计模式和数据结构与算法，具备良好的代码设计能力</li><li>熟悉Git版本控制工具，有良好的代码规范和文档编写习惯</li><li>了解前端性能优化方案，包括首屏优化、懒加载、代码分割等</li></ul>',
    is_hide: false,
  },
  qualifications: {
    content: '<p>大学英语六级（CET-6）、计算机技术与软件专业技术资格（中级）、软件设计师证书</p>',
    is_hide: false,
  },
  custom_module_info: [
    {
      name: '自定义模块',
      content: '<p>这个是自定一个的内容</p>',
      is_hide: false,
      module_name: 'custom_module_0101fef91e47bc1e3f1d2e48d512bbf6',
    },
  ],
}
