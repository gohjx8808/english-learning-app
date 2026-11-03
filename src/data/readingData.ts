import { ReadingPassage } from '../types';

export const READING_PASSAGES: ReadingPassage[] = [
  {
    id: 'r-1',
    title: 'My First Day at a New Job',
    titleZh: '新工作的第一天',
    category: 'Work and career',
    level: 'A2',
    estimatedMinutes: 4,
    paragraphs: [
      {
        en: 'Yesterday was my very first day as a junior accountant at an international logistics firm. I woke up at 6:00 AM because I wanted to make sure I would not arrive late.',
        zh: '昨天是我在一家国际物流公司担任初级会计的第一天。我早上六点就起床了，因为我想确保自己不会迟到。',
      },
      {
        en: 'When I stepped into the office, my team manager, David, welcomed me with a friendly smile. He showed me to my desk, which had a brand-new laptop and a notebook waiting for me.',
        zh: '当我走进办公室时，我的团队经理戴维面带友好的微笑迎接了我。他带我走到我的办公桌前，桌上有一台崭新的笔记本电脑和一个笔记本正等着我。',
      },
      {
        en: 'At 10:00 AM, David introduced me to my new colleagues. Everyone was very patient and encouraged me to ask questions whenever I felt confused. Later, we had lunch together in the cafeteria.',
        zh: '上午十点，戴维把我介绍给了新同事们。大家都很有耐心，并鼓励我在感到困惑时随时提问。后来，我们一起在员工餐厅吃了午餐。',
      },
      {
        en: 'Although there was a lot of new software to learn, I felt comfortable and excited about the future of my career here.',
        zh: '虽然有许多新软件需要学习，但我感到很踏实，并对自己在这里的职业未来感到兴奋。',
      },
    ],
    vocabulary: [
      { word: 'accountant', pos: 'noun', meaningZh: '会计，会计师', phonetic: '/əˈkaʊn.tənt/' },
      { word: 'logistics', pos: 'noun', meaningZh: '物流', phonetic: '/ləˈdʒɪs.tɪks/' },
      { word: 'colleagues', pos: 'noun', meaningZh: '同事们', phonetic: '/ˈkɒl.iːɡz/' },
      { word: 'patient', pos: 'adjective', meaningZh: '有耐心的', phonetic: '/ˈpeɪ.ʃənt/' },
      { word: 'confused', pos: 'adjective', meaningZh: '感到困惑的', phonetic: '/kənˈfjuːzd/' },
      { word: 'cafeteria', pos: 'noun', meaningZh: '自助餐厅，食堂', phonetic: '/ˌkæf.əˈtɪə.ri.ə/' },
    ],
    questions: [
      {
        id: 'q-r1-1',
        question: 'Why did the writer wake up early at 6:00 AM?',
        options: [
          'To clean the apartment',
          'To make sure he would not be late for his new job',
          'To study for an exam',
          'To cook lunch for his manager',
        ],
        correctAnswerIndex: 1,
        explanation: 'The text states: "I woke up at 6:00 AM because I wanted to make sure I would not arrive late."',
      },
      {
        id: 'q-r1-2',
        question: 'What was waiting on the writer’s desk?',
        options: [
          'A cup of black coffee and documents',
          'A brand-new laptop and a notebook',
          'A telephone and flowers',
          'A stack of printed financial reports',
        ],
        correctAnswerIndex: 1,
        explanation: 'Paragraph 2 mentions "a brand-new laptop and a notebook waiting for me."',
      },
      {
        id: 'q-r1-3',
        question: 'How did the writer feel by the end of the day?',
        options: [
          'Bored and disappointed',
          'Very anxious and unhappy',
          'Comfortable and excited about the future',
          'Too exhausted to return',
        ],
        correctAnswerIndex: 2,
        explanation: 'The final sentence says: "I felt comfortable and excited about the future of my career here."',
      },
    ],
  },

  {
    id: 'r-2',
    title: 'A Weekend Trip to Edinburgh',
    titleZh: '爱丁堡周末之旅',
    category: 'Travel',
    level: 'A2',
    estimatedMinutes: 5,
    paragraphs: [
      {
        en: 'Last weekend, my partner and I took a four-hour train ride from London Kings Cross to Edinburgh, the historic capital of Scotland.',
        zh: '上周末，我和伴侣从伦敦国王十字车站乘坐了四个小时的火车前往苏格兰历史名都爱丁堡。',
      },
      {
        en: 'The train journey was smooth and scenic. We looked out the window at green rolling hills and sheep grazing peacefully under the bright morning sun.',
        zh: '火车之旅平稳且风景如画。我们透过车窗望去，看到绿意起伏的山丘和在明媚晨光下悠然吃草的羊群。',
      },
      {
        en: 'In the afternoon, we walked along the Royal Mile, a famous cobblestone street filled with traditional souvenir shops and street performers playing bagpipes.',
        zh: '下午，我们漫步在著名的鹅卵石街道皇家一英里上，那里到处都是传统的纪念品商店和吹奏风笛的街头艺人。',
      },
      {
        en: 'Our favourite attraction was Edinburgh Castle, perched high on an extinct volcanic rock overlooking the whole city and the blue sea in the distance.',
        zh: '我们最喜欢的景点是爱丁堡城堡，它坐落在一座俯瞰整座城市与远方蔚蓝大海的死火山岩石上。',
      },
    ],
    vocabulary: [
      { word: 'scenic', pos: 'adjective', meaningZh: '风景优美的', phonetic: '/ˈsiː.nɪk/' },
      { word: 'grazing', pos: 'verb', meaningZh: '吃草，放牧', phonetic: '/ˈɡreɪ.zɪŋ/' },
      { word: 'cobblestone', pos: 'noun', meaningZh: '鹅卵石', phonetic: '/ˈkɒb.əl.stəʊn/' },
      { word: 'bagpipes', pos: 'noun', meaningZh: '风笛（苏格兰传统乐器）', phonetic: '/ˈbæɡ.paɪps/' },
      { word: 'volcanic', pos: 'adjective', meaningZh: '火山的', phonetic: '/vɒlˈkæn.ɪk/' },
    ],
    questions: [
      {
        id: 'q-r2-1',
        question: 'How long did the train journey take from London to Edinburgh?',
        options: ['Two hours', 'Four hours', 'Six hours', 'Eight hours'],
        correctAnswerIndex: 1,
        explanation: 'Paragraph 1 specifies: "my partner and I took a four-hour train ride".',
      },
      {
        id: 'q-r2-2',
        question: 'What musical instrument were street performers playing on the Royal Mile?',
        options: ['Guitars', 'Violins', 'Bagpipes', 'Pianos'],
        correctAnswerIndex: 2,
        explanation: 'Paragraph 3 notes: "street performers playing bagpipes."',
      },
      {
        id: 'q-r2-3',
        question: 'Where is Edinburgh Castle located?',
        options: [
          'Underground near the central station',
          'High on an extinct volcanic rock overlooking the city',
          'On a small island in the river',
          'Inside a botanical garden',
        ],
        correctAnswerIndex: 1,
        explanation: 'Paragraph 4 states it was "perched high on an extinct volcanic rock".',
      },
    ],
  },

  {
    id: 'r-3',
    title: 'How to Make a Great Cup of Tea',
    titleZh: '如何泡一杯好茶',
    category: 'Daily life',
    level: 'A2',
    estimatedMinutes: 3,
    paragraphs: [
      {
        en: 'Tea is one of the most popular hot beverages across the globe. Although making tea seems simple, following a few practical tips can make your tea taste substantially better.',
        zh: '茶是全球最受欢迎的热饮之一。虽然泡茶看似简单，但遵循几个实用窍门可以显著改善茶的口感。',
      },
      {
        en: 'First, always use fresh, cold tap water instead of re-boiling water already in the kettle. Re-boiled water loses dissolved oxygen, which makes tea taste flat and dull.',
        zh: '首先，务必使用新鲜的冷自来水，而不是将水壶中已有的水反复烧开。千滚水会损失溶解氧，使茶水喝起来平淡无味。',
      },
      {
        en: 'Second, pay attention to the water temperature. Black tea and herbal tea require freshly boiled water at 100°C, while delicate green tea tastes best with water cooled to around 80°C.',
        zh: '其次，注意水温。红茶和草本茶需要刚烧开的100℃沸水，而娇嫩的绿茶用冷却至80℃左右的水冲泡口感最佳。',
      },
      {
        en: 'Finally, let black tea steep for three to four minutes. If you enjoy milk, add it after removing the tea bag to keep the infusion rich and aromatic.',
        zh: '最后，让红茶浸泡三到四分钟。如果你喜欢加牛奶，请在取出茶包后再加入，以保持茶汤香浓郁醇。',
      },
    ],
    vocabulary: [
      { word: 'beverage', pos: 'noun', meaningZh: '饮品，饮料', phonetic: '/ˈbev.ər.ɪdʒ/' },
      { word: 'kettle', pos: 'noun', meaningZh: '烧水壶', phonetic: '/ˈket.əl/' },
      { word: 'oxygen', pos: 'noun', meaningZh: '氧气', phonetic: '/ˈɒk.sɪ.dʒən/' },
      { word: 'delicate', pos: 'adjective', meaningZh: '娇嫩的，精致的', phonetic: '/ˈdel.ɪ.kət/' },
      { word: 'steep', pos: 'verb', meaningZh: '浸泡（茶等）', phonetic: '/stiːp/' },
      { word: 'aromatic', pos: 'adjective', meaningZh: '芳香的，香气扑鼻的', phonetic: '/ˌær.əˈmæt.ɪk/' },
    ],
    questions: [
      {
        id: 'q-r3-1',
        question: 'Why should you avoid using re-boiled water for tea?',
        options: [
          'It takes too long to warm up',
          'It loses dissolved oxygen and makes tea taste flat',
          'It ruins the ceramic teapot',
          'It contains too much milk',
        ],
        correctAnswerIndex: 1,
        explanation: 'Paragraph 2 explains: "Re-boiled water loses dissolved oxygen, which makes tea taste flat and dull."',
      },
      {
        id: 'q-r3-2',
        question: 'What is the recommended temperature for brewing green tea?',
        options: ['100°C', 'Around 80°C', '50°C', 'Ice-cold'],
        correctAnswerIndex: 1,
        explanation: 'Paragraph 3 notes: "delicate green tea tastes best with water cooled to around 80°C."',
      },
      {
        id: 'q-r3-3',
        question: 'When should milk be added if making British-style black tea?',
        options: [
          'Before adding the water',
          'After removing the tea bag',
          'Never add milk under any circumstances',
          'Into the kettle directly',
        ],
        correctAnswerIndex: 1,
        explanation: 'Paragraph 4 states: "add it after removing the tea bag".',
      },
    ],
  },

  {
    id: 'r-4',
    title: 'Renting an Apartment in the City',
    titleZh: '在城市租房',
    category: 'Daily life',
    level: 'A2',
    estimatedMinutes: 4,
    paragraphs: [
      {
        en: 'Moving into a new city can be both thrilling and stressful. Finding an affordable apartment close to public transport is usually the top priority for young professionals.',
        zh: '搬到一个新城市既令人兴奋又充满压力。对于年轻职场人士而言，找到一套靠近公共交通且租金实惠的公寓通常是头等大事。',
      },
      {
        en: 'Before signing a rental contract, it is wise to inspect the property in person. Check that all water taps work properly, the heating functions, and windows close tightly.',
        zh: '在签署租赁合同之前，亲自实地验房是明智之举。检查所有水龙头是否正常工作、暖气是否运转，以及窗户是否严密关闭。',
      },
      {
        en: 'Furthermore, always ask the landlord or agent which utility bills are included in the monthly rent. Often, electricity, internet, and council tax are paid separately.',
        zh: '此外，一定要向房东或中介询问月租金中包含哪些杂费账单。通常，电费、网费和市政税是分开单独支付的。',
      },
      {
        en: 'Keeping a written copy of the deposit receipt and taking photos of the apartment on moving day will protect you from future misunderstandings.',
        zh: '保留押金收据的书面复印件并在搬家当天拍下公寓照片，能够防止日后产生误会。',
      },
    ],
    vocabulary: [
      { word: 'stressful', pos: 'adjective', meaningZh: '有压力的', phonetic: '/ˈstres.fəl/' },
      { word: 'priority', pos: 'noun', meaningZh: '首要事项，优先权', phonetic: '/praɪˈɒr.ə.ti/' },
      { word: 'contract', pos: 'noun', meaningZh: '合同，契约', phonetic: '/ˈkɒn.trækt/' },
      { word: 'landlord', pos: 'noun', meaningZh: '房东', phonetic: '/ˈlænd.lɔːd/' },
      { word: 'deposit', pos: 'noun', meaningZh: '押金，定金', phonetic: '/dɪˈpɒz.ɪt/' },
    ],
    questions: [
      {
        id: 'q-r4-1',
        question: 'What is usually the top priority when young professionals look for a home?',
        options: [
          'A building with a private swimming pool',
          'An affordable apartment close to public transport',
          'A house with a large backyard',
          'A flat on the top floor of a skyscraper',
        ],
        correctAnswerIndex: 1,
        explanation: 'Paragraph 1 mentions: "Finding an affordable apartment close to public transport is usually the top priority".',
      },
      {
        id: 'q-r4-2',
        question: 'Which bills are often paid separately from the rent?',
        options: [
          'Only tap water',
          'Electricity, internet, and council tax',
          'Car petrol and meals',
          'None, everything is always free',
        ],
        correctAnswerIndex: 1,
        explanation: 'Paragraph 3 notes: "Often, electricity, internet, and council tax are paid separately."',
      },
      {
        id: 'q-r4-3',
        question: 'Why should tenants take photos of the apartment on moving day?',
        options: [
          'To post on social media immediately',
          'To show interior design friends',
          'To protect from future misunderstandings regarding damages',
          'To sell the furniture online',
        ],
        correctAnswerIndex: 2,
        explanation: 'Paragraph 4 states it "will protect you from future misunderstandings."',
      },
    ],
  },

  {
    id: 'r-5',
    title: 'A Healthy Morning Routine',
    titleZh: '健康清晨作息',
    category: 'Health',
    level: 'A2',
    estimatedMinutes: 4,
    paragraphs: [
      {
        en: 'The way you begin your morning often sets the tone for your entire day. Developing a calm and healthy morning routine can enhance your focus and reduce anxiety.',
        zh: '你开启早晨的方式往往决定了你一整天的基调。养成平静健康的清晨作息能够提高专注力并减少焦虑。',
      },
      {
        en: 'First, resist the temptation to check social media or email the minute you open your eyes. Screen light and urgent messages flood your brain with sudden stress before you even get out of bed.',
        zh: '首先，克制一睁眼就刷社交媒体或查邮件的冲动。屏幕强光和紧急消息会让你还没起床就给大脑带来突如其来的压力。',
      },
      {
        en: 'Instead, drink a tall glass of lukewarm water to rehydrate your body. Doing five to ten minutes of gentle stretching or yoga awakens stiff muscles and promotes blood circulation.',
        zh: '相反，喝一大杯温水来补充体内水分。做五到十分钟轻柔的拉伸或瑜伽能够唤醒僵硬的肌肉并促进血液循环。',
      },
      {
        en: 'Pair this with a balanced breakfast containing whole grains, fruit, and protein like eggs or yoghurt. You will feel energized and ready to tackle your daily tasks.',
        zh: '再搭配一份包含全谷物、水果以及鸡蛋或酸奶等蛋白质的均衡早餐，你就会感到精力充沛，准备好迎接一天的各项任务。',
      },
    ],
    vocabulary: [
      { word: 'temptation', pos: 'noun', meaningZh: '诱惑', phonetic: '/tempˈteɪ.ʃən/' },
      { word: 'lukewarm', pos: 'adjective', meaningZh: '微温的', phonetic: '/ˌluːkˈwɔːm/' },
      { word: 'rehydrate', pos: 'verb', meaningZh: '补充水分', phonetic: '/ˌriː.haɪˈdreɪt/' },
      { word: 'circulation', pos: 'noun', meaningZh: '血液循环', phonetic: '/ˌsɜː.kjəˈleɪ.ʃən/' },
      { word: 'protein', pos: 'noun', meaningZh: '蛋白质', phonetic: '/ˈprəʊ.tiːn/' },
    ],
    questions: [
      {
        id: 'q-r5-1',
        question: 'What is discouraged right after opening your eyes in the morning?',
        options: [
          'Drinking water',
          'Checking social media or email immediately',
          'Stretching in bed',
          'Opening the curtains',
        ],
        correctAnswerIndex: 1,
        explanation: 'Paragraph 2 suggests: "resist the temptation to check social media or email the minute you open your eyes."',
      },
      {
        id: 'q-r5-2',
        question: 'What benefit does gentle stretching provide in the morning?',
        options: [
          'It makes you sleepy again',
          'It awakens stiff muscles and promotes blood circulation',
          'It replaces having breakfast',
          'It saves electricity',
        ],
        correctAnswerIndex: 1,
        explanation: 'Paragraph 3 notes: "awakens stiff muscles and promotes blood circulation."',
      },
      {
        id: 'q-r5-3',
        question: 'Which elements make up a balanced breakfast according to the text?',
        options: [
          'Only sweet chocolate candies',
          'Whole grains, fruit, and protein like eggs or yoghurt',
          'Cold soda and chips',
          'Coffee with sugar and no food',
        ],
        correctAnswerIndex: 1,
        explanation: 'Paragraph 4 recommends "whole grains, fruit, and protein like eggs or yoghurt."',
      },
    ],
  },

  {
    id: 'r-6',
    title: 'Shopping at the Farmers’ Market',
    titleZh: '农贸市场购物',
    category: 'Shopping',
    level: 'A2',
    estimatedMinutes: 3,
    paragraphs: [
      {
        en: 'Every Saturday morning, the town square transforms into an energetic farmers’ market. Local growers and bakers arrive at dawn to arrange their colourful stalls.',
        zh: '每周六早晨，城镇广场都会变成充满活力的农贸市场。当地种植户和面包师黎明时分就赶来摆好色彩斑斓的摊位。',
      },
      {
        en: 'Shopping here is very different from visiting a large supermarket. You can converse directly with the farmers and learn where your carrots, apples, and honey were harvested.',
        zh: '在这里买菜和逛大型超市大不相同。你可以直接与农户交谈，了解你的胡萝卜、苹果和蜂蜜是在哪里采摘收获的。',
      },
      {
        en: 'Most vendors are happy to offer complimentary samples. Last week, I tasted three varieties of artisan cheese before choosing a mild cheddar with herbs.',
        zh: '大多数摊主都很乐意提供免费试吃。上周，我在挑选带有香草的温和切达奶酪之前，先品尝了三种手工奶酪。',
      },
      {
        en: 'Remember to bring reusable cloth bags and some coins or cash, as a few smaller stalls do not accept card payments.',
        zh: '记得带上环保布袋和一些硬币或现金，因为少数几个小摊位不接受刷卡支付。',
      },
    ],
    vocabulary: [
      { word: 'stall', pos: 'noun', meaningZh: '货摊，摊位', phonetic: '/stɔːl/' },
      { word: 'harvest', pos: 'verb', meaningZh: '收获，采摘', phonetic: '/ˈhɑː.vɪst/' },
      { word: 'vendor', pos: 'noun', meaningZh: '小贩，摊主', phonetic: '/ˈven.dər/' },
      { word: 'complimentary', pos: 'adjective', meaningZh: '免费赠送的', phonetic: '/ˌkɒm.plɪˈmen.tər.i/' },
      { word: 'reusable', pos: 'adjective', meaningZh: '可重复使用的', phonetic: '/ˌriːˈjuː.zə.bəl/' },
    ],
    questions: [
      {
        id: 'q-r6-1',
        question: 'When does the farmers’ market take place in the town square?',
        options: ['Every Monday evening', 'Every Saturday morning', 'On the first day of every month', 'Only in winter'],
        correctAnswerIndex: 1,
        explanation: 'Paragraph 1 begins: "Every Saturday morning, the town square transforms into an energetic farmers’ market."',
      },
      {
        id: 'q-r6-2',
        question: 'What advantage does shopping at this market have over supermarkets?',
        options: [
          'Prices are ten times cheaper',
          'You can converse directly with the growers and know where food comes from',
          'Everything is imported from other countries',
          'The market stays open 24 hours',
        ],
        correctAnswerIndex: 1,
        explanation: 'Paragraph 2 points out: "You can converse directly with the farmers and learn where your carrots... were harvested."',
      },
      {
        id: 'q-r6-3',
        question: 'Why should shoppers carry cash or coins?',
        options: [
          'Cash is legally required everywhere',
          'A few smaller stalls do not accept card payments',
          'Banks are closed on Saturdays',
          'Vendors do not trust cards',
        ],
        correctAnswerIndex: 1,
        explanation: 'Paragraph 4 states: "as a few smaller stalls do not accept card payments."',
      },
    ],
  },

  {
    id: 'r-7',
    title: 'A Lost Passport at the Airport',
    titleZh: '机场遗失护照',
    category: 'Travel',
    level: 'A2',
    estimatedMinutes: 4,
    paragraphs: [
      {
        en: 'Liam was waiting in the departure lounge for his flight to Singapore when he suddenly realized his small leather passport pouch was missing from his coat pocket.',
        zh: '利亚姆正在候机室等待飞往新加坡的航班，突然他发现大衣口袋里装护照的小皮包不见了。',
      },
      {
        en: 'His heart raced with panic because boarding was scheduled to begin in less than thirty minutes. Taking a deep breath, he retraced his steps back to the airport cafe where he had ordered a latte.',
        zh: '他的心因慌乱而狂跳，因为距离登机只剩下不到三十分钟了。他深吸了一口气，顺着自己走过的路线返回刚才点了一杯拿铁的机场咖啡厅。',
      },
      {
        en: 'Approaching the counter, Liam explained his dilemma politely to the barista. To his immense relief, the barista smiled and handed over the pouch, which an honest passenger had found on a table.',
        zh: '走到柜台前，利亚姆礼貌地向咖啡师解释了他的困境。让他万分欣慰的是，咖啡师微笑着递上了小包，原来是一位热心诚实的乘客在桌上捡到的。',
      },
      {
        en: 'Liam thanked the staff sincerely, dashed to Gate 14, and boarded the airplane just as the final call sounded.',
        zh: '利亚姆真诚地向工作人员道谢，飞奔到14号登机口，正好在最后催促登机广播响起时登上了飞机。',
      },
    ],
    vocabulary: [
      { word: 'lounge', pos: 'noun', meaningZh: '候机室，休息室', phonetic: '/laʊndʒ/' },
      { word: 'retrace', pos: 'verb', meaningZh: '沿原路返回', phonetic: '/rɪˈtreɪs/' },
      { word: 'dilemma', pos: 'noun', meaningZh: '困境，进退两难', phonetic: '/daɪˈlem.ə/' },
      { word: 'immense', pos: 'adjective', meaningZh: '极大的，巨大的', phonetic: '/ɪˈmens/' },
      { word: 'sincerely', pos: 'adverb', meaningZh: '由衷地，真诚地', phonetic: '/sɪnˈsɪə.li/' },
    ],
    questions: [
      {
        id: 'q-r7-1',
        question: 'Where was Liam travelling to?',
        options: ['Tokyo', 'London', 'Singapore', 'Sydney'],
        correctAnswerIndex: 2,
        explanation: 'Paragraph 1 mentions: "his flight to Singapore".',
      },
      {
        id: 'q-r7-2',
        question: 'Where did Liam leave his passport pouch?',
        options: ['Inside the airplane bathroom', 'At the airport cafe', 'In the parking lot', 'At the subway turnstile'],
        correctAnswerIndex: 1,
        explanation: 'He retraced his steps back to "the airport cafe where he had ordered a latte."',
      },
      {
        id: 'q-r7-3',
        question: 'Who found the lost pouch?',
        options: ['A police officer', 'An honest passenger', 'The airline pilot', 'A flight attendant'],
        correctAnswerIndex: 1,
        explanation: 'Paragraph 3 notes that "an honest passenger had found on a table."',
      },
    ],
  },

  {
    id: 'r-8',
    title: 'Inviting Friends for Dinner',
    titleZh: '邀请朋友共进晚餐',
    category: 'Food and restaurants',
    level: 'A2',
    estimatedMinutes: 4,
    paragraphs: [
      {
        en: 'Hosting a dinner party at home is a wonderful way to deepen bonds with friends and family. However, a successful evening requires thoughtful preparation.',
        zh: '在家里举办晚餐聚会是加深与朋友和家人情谊的绝佳方式。然而，一个成功的夜晚需要周到的准备。',
      },
      {
        en: 'A few days prior to the gathering, send an invitation message and politely inquire whether any guests have dietary restrictions or food allergies.',
        zh: '聚会前几天，发送一条邀请信息，并礼貌地询问是否有客人有饮食禁忌或食物过敏。',
      },
      {
        en: 'Select dishes that can be cooked in advance, such as slow-roasted chicken or a rich vegetable lasagna. This prevents you from being trapped behind the stove while your guests are socializing in the living room.',
        zh: '挑选那些可以提前做好的菜肴，比如慢烤鸡或浓郁的蔬菜千层面。这样可以避免当客人在客厅社交时，你却被困在炉灶旁忙碌。',
      },
      {
        en: 'Play soft background jazz music, dim the ceiling lamps, and place a few candles on the dining table to establish a cosy, inviting atmosphere.',
        zh: '播放舒缓的背景爵士乐，调暗顶灯，在餐桌上点上几支蜡烛，营造出舒适温馨的待客氛围。',
      },
    ],
    vocabulary: [
      { word: 'deepen', pos: 'verb', meaningZh: '加深', phonetic: '/ˈdiː.pən/' },
      { word: 'dietary', pos: 'adjective', meaningZh: '饮食的', phonetic: '/ˈdaɪ.ə.tər.i/' },
      { word: 'allergies', pos: 'noun', meaningZh: '过敏症', phonetic: '/ˈæl.ə.dʒiz/' },
      { word: 'lasagna', pos: 'noun', meaningZh: '千层面（意式焗面）', phonetic: '/ləˈzæn.jə/' },
      { word: 'atmosphere', pos: 'noun', meaningZh: '气氛，氛围', phonetic: '/ˈæt.məs.fɪər/' },
    ],
    questions: [
      {
        id: 'q-r8-1',
        question: 'What is important to ask guests prior to the dinner party?',
        options: [
          'How much money they earn',
          'Whether they have dietary restrictions or food allergies',
          'What brand of shoes they wear',
          'If they can bring their own furniture',
        ],
        correctAnswerIndex: 1,
        explanation: 'Paragraph 2 advises to "politely inquire whether any guests have dietary restrictions or food allergies."',
      },
      {
        id: 'q-r8-2',
        question: 'Why should hosts choose dishes that can be prepared in advance?',
        options: [
          'Because ovens stop working at 7 PM',
          'To prevent being stuck in the kitchen while guests socialize',
          'So guests can cook their own meals',
          'To save electricity bills',
        ],
        correctAnswerIndex: 1,
        explanation: 'Paragraph 3 explains it prevents you from being "trapped behind the stove while your guests are socializing".',
      },
      {
        id: 'q-r8-3',
        question: 'How can you create a cosy atmosphere on the dining table?',
        options: [
          'Turn on glaring bright stadium spotlights',
          'Dim lamps and light a few candles with soft background music',
          'Put a television with maximum volume on the table',
          'Leave the table empty without napkins',
        ],
        correctAnswerIndex: 1,
        explanation: 'Paragraph 4 recommends soft jazz, dimmed lights, and candles.',
      },
    ],
  },

  {
    id: 'r-9',
    title: 'Joining a Local Gym',
    titleZh: '加入当地健身房',
    category: 'Health',
    level: 'A2',
    estimatedMinutes: 4,
    paragraphs: [
      {
        en: 'After sitting in front of a computer screen for forty hours a week, Lucas decided it was high time to improve his physical fitness by joining a local gym.',
        zh: '在每周对着电脑屏幕坐了四十个小时之后，卢卡斯决定是时候通过加入当地健身房来提高身体素质了。',
      },
      {
        en: 'On his first visit, a certified personal trainer gave him a comprehensive induction. The trainer demonstrated how to adjust the treadmill incline and properly lift light dumbbells without straining joints.',
        zh: '初次到访时，一位持证私人教练为他做了全面的入门指导。教练演示了如何调整跑步机坡度，以及如何正确举起轻哑铃而不拉伤关节。',
      },
      {
        en: 'Lucas learned that consistency is far more crucial than intensity. Exercising thirty minutes three times a week is much healthier than pushing to exhaustion once a month.',
        zh: '卢卡斯认识到，持之以恒远比强度过大更为关键。每周运动三次、每次三十分钟，比一个月咬牙猛练一次到精疲力竭要健康得多。',
      },
      {
        en: 'Within four weeks, his back pain disappeared, his posture straightened, and he fell asleep much faster every night.',
        zh: '不到四周，他的背痛消失了，体态变得挺拔，而且每天晚上入睡也快了许多。',
      },
    ],
    vocabulary: [
      { word: 'fitness', pos: 'noun', meaningZh: '健康，体魄', phonetic: '/ˈfɪt.nəs/' },
      { word: 'induction', pos: 'noun', meaningZh: '入门引导，就职培训', phonetic: '/ɪnˈdʌk.ʃən/' },
      { word: 'dumbbells', pos: 'noun', meaningZh: '哑铃', phonetic: '/ˈdʌm.belz/' },
      { word: 'consistency', pos: 'noun', meaningZh: '一贯性，持之以恒', phonetic: '/kənˈsɪs.tən.si/' },
      { word: 'posture', pos: 'noun', meaningZh: '姿势，体态', phonetic: '/ˈpɒs.tʃər/' },
    ],
    questions: [
      {
        id: 'q-r9-1',
        question: 'Why did Lucas decide to join a gym?',
        options: [
          'To become a professional boxer',
          'To improve his physical fitness after sitting at a desk all week',
          'Because his doctor forced him',
          'To sell sportswear',
        ],
        correctAnswerIndex: 1,
        explanation: 'Paragraph 1 mentions sitting 40 hours a week and deciding to improve fitness.',
      },
      {
        id: 'q-r9-2',
        question: 'What principle did Lucas discover about exercising effectively?',
        options: [
          'Only lift heavy weights once a year',
          'Consistency is far more crucial than intensity',
          'Never drink water while working out',
          'Skip warmup exercises to save time',
        ],
        correctAnswerIndex: 1,
        explanation: 'Paragraph 3 states: "consistency is far more crucial than intensity."',
      },
      {
        id: 'q-r9-3',
        question: 'What health improvements did Lucas notice within four weeks?',
        options: [
          'His back pain vanished and he fell asleep faster',
          'He gained 20 pounds of weight',
          'He felt more tired during the day',
          'He lost his eyesight',
        ],
        correctAnswerIndex: 0,
        explanation: 'Paragraph 4 lists: "his back pain disappeared, his posture straightened, and he fell asleep much faster".',
      },
    ],
  },

  {
    id: 'r-10',
    title: 'My Favourite Childhood Memory',
    titleZh: '我最珍视的童年回忆',
    category: 'Relationships',
    level: 'A2',
    estimatedMinutes: 4,
    paragraphs: [
      {
        en: 'Whenever I catch the fragrant scent of baking cinnamon bread, my mind instantly drifts back to my grandmother’s cosy countryside kitchen.',
        zh: '每当我闻到烘焙肉桂面包的清香，思绪总会瞬间飘回到外婆温馨的乡间厨房。',
      },
      {
        en: 'During summer holidays, my cousins and I used to spend entire afternoons helping her pick ripe blackberries along the riverbank behind her vegetable garden.',
        zh: '暑假期间，我和表兄弟们常常花一整个下午帮她在菜园后面的河岸边采摘成熟的黑莓。',
      },
      {
        en: 'Our hands and mouths were always stained with purple juice, but grandmother never scolded us; she just laughed warmly and handed us big wooden spoons.',
        zh: '我们的手上和嘴边总是沾满了紫色的果汁，但外婆从不责怪我们；她只是温暖地笑笑，递给我们几把大木勺。',
      },
      {
        en: 'Now that I live in a bustling modern city, those peaceful afternoons filled with love and laughter remain my most cherished treasure.',
        zh: '如今我生活在喧嚣繁华的现代大都市，那些充满爱与欢笑的平静午后依然是我最珍贵的宝藏。',
      },
    ],
    vocabulary: [
      { word: 'scent', pos: 'noun', meaningZh: '气味，香味', phonetic: '/sent/' },
      { word: 'cinnamon', pos: 'noun', meaningZh: '肉桂', phonetic: '/ˈsɪn.ə.mən/' },
      { word: 'stained', pos: 'adjective', meaningZh: '沾染污渍的', phonetic: '/steɪnd/' },
      { word: 'scolded', pos: 'verb', meaningZh: '责备，斥责', phonetic: '/ˈskəʊl.dɪd/' },
      { word: 'cherished', pos: 'adjective', meaningZh: '珍视的，怀恋的', phonetic: '/ˈtʃer.ɪʃt/' },
    ],
    questions: [
      {
        id: 'q-r10-1',
        question: 'What triggers the writer’s memories of childhood?',
        options: [
          'The sound of a train horn',
          'The scent of baking cinnamon bread',
          'The sight of falling autumn leaves',
          'A photograph of an old car',
        ],
        correctAnswerIndex: 1,
        explanation: 'Paragraph 1 begins: "Whenever I catch the fragrant scent of baking cinnamon bread...".',
      },
      {
        id: 'q-r10-2',
        question: 'What did the grandchildren collect along the riverbank in summer?',
        options: ['Wild mushrooms', 'Smooth river stones', 'Ripe blackberries', 'Fishing rods'],
        correctAnswerIndex: 2,
        explanation: 'Paragraph 2 specifies: "helping her pick ripe blackberries along the riverbank".',
      },
      {
        id: 'q-r10-3',
        question: 'How did the grandmother react when the children got stained with juice?',
        options: [
          'She got very angry and sent them home',
          'She scolded them for getting their clothes dirty',
          'She laughed warmly and handed them wooden spoons',
          'She made them wash all the dishes',
        ],
        correctAnswerIndex: 2,
        explanation: 'Paragraph 3 states: "grandmother never scolded us; she just laughed warmly and handed us big wooden spoons."',
      },
    ],
  },
];
