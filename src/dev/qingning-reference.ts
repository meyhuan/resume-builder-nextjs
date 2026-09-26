import type { ResumeData } from "@/entities/resume/resume-data";

/** Comparison-only sample; the template itself never supplies resume content. */
export const qingningReferenceResume: ResumeData = {
  id: "scenario-qingning-reference",
  name: "张小可",
  baseInfo: {
    title: "销售专员",
    phone: "13066668888",
    email: "cnsupport@canva.com",
    household: "广东省深圳市",
    showAvatar: true,
    avatarUrl: "/avatar.jpg",
    customFields: [
      { label: "出生年月", value: "2003年3月" },
      { label: "毕业院校", value: "可瓦大学" },
    ],
  },
  jobIntention: { position: "销售专员" },
  jobIntentionVisible: true,
  sections: [
    {
      id: "qingning-education",
      title: "教育背景",
      columns: 1,
      blocks: [
        {
          id: "qingning-edu-1",
          type: "education",
          school: "可瓦大学",
          major: "电子商务专业",
          startDate: "2021.09",
          endDate: "2025.06",
          courseHtml:
            "<p>GPA：3.6（专业前10%）</p><p>主修课程：计算机网络原理、电子商务概论、网络营销基础与实践、电子商务与国际贸易、电子商务信函写作、营销策划、数据结构、Java语言、电子商务网站建设等。</p>",
        },
      ],
    },
    {
      id: "qingning-internship",
      title: "实习经历",
      columns: 1,
      blocks: [
        {
          id: "qingning-intern-1",
          type: "experience",
          company: "可瓦科技公司",
          position: "市场部实习生",
          startDate: "2025.02",
          endDate: "2025.05",
          contentHtml:
            "<ul><li>策划并执行线上营销活动，负责社交媒体平台内容运营。</li><li>协助完成市场调研项目，通过问卷设计、数据分析，精准定位目标客户群体需求。</li><li>参与线下活动落地执行，负责活动现场布置。</li></ul>",
        },
      ],
    },
    {
      id: "qingning-campus",
      title: "校园经历",
      columns: 1,
      blocks: [
        {
          id: "qingning-campus-1",
          type: "campus",
          organization: "可瓦大学",
          position: "宣传部主编",
          startDate: "2022.09",
          endDate: "2023.06",
          contentHtml:
            "<ul><li>定期组织技能培训与团队建设活动，提升成员宣传策划与执行能力。</li><li>统筹策划校园大型活动宣传工作，包括迎新晚会、校园文化节等。</li></ul>",
        },
        {
          id: "qingning-campus-2",
          type: "campus",
          organization: "可瓦大学",
          position: "记者部部长",
          startDate: "2021.09",
          endDate: "2022.06",
          contentHtml:
            "<ul><li>统筹策划校园新闻报道工作，带领团队完成校园重大事件、学术讲座等。</li><li>加强与校内外媒体、社团合作，拓展新闻传播渠道。</li></ul>",
        },
      ],
    },
    {
      id: "qingning-certificates",
      title: "持有证书",
      columns: 1,
      blocks: [
        {
          id: "qingning-cert-1",
          type: "text",
          html: "<p>大学英语六级证书、大学英语四级证书、普通话国家一级乙等证书、计算机考试二级证书、熟练掌握Excel等办公软件。</p>",
        },
      ],
    },
    {
      id: "qingning-summary",
      title: "自我评价",
      columns: 1,
      blocks: [
        {
          id: "qingning-summary-1",
          type: "text",
          html: "<p>本人是电子商务专业本科毕业生，具备扎实的理论知识，拥有丰富的实习与校园实践经验，能够熟练运用多种营销工具。具备较强的数据分析能力，善于从市场数据中挖掘潜在机会，制定针对性营销策略。个性开朗，容易相处，团队荣誉感强，有明确的职业规划。</p>",
        },
      ],
    },
  ],
};
