import { SampleAudio } from '../types';

export const SAMPLE_AUDIO_ITEMS: SampleAudio[] = [
  {
    id: 'greeting',
    title: 'Сәлеметсіз бе! (Salutations et présentation)',
    description: 'Salutation formelle, questions d\'usage et présentation personnelle en kazakh standard.',
    duration: '0:08',
    kazakhSampleText: 'Сәлеметсіз бе! Менің атым Айгүл. Қазақстанға қош келдіңіз! Бүгін ауа райы өте тамаша, күн жылы болып тұр.',
    englishTranslation: 'Hello! My name is Aigul. Welcome to Kazakhstan! The weather today is wonderful, and the sun is warm.',
    notes: 'Discours formel respectant l\'harmonie vocalique (үндестік заңы). Présence prononcée des phonèmes spécifiques kazakhs: [ә], [і], [ң], [ғ], [ө], [ұ].',
    segments: [
      {
        start_time: '00:00:00,500',
        end_time: '00:00:02,800',
        kazakh_text: 'Сәлеметсіз бе! Менің атым Айгүл.',
        english_text: 'Hello! My name is Aigul.',
      },
      {
        start_time: '00:00:03,000',
        end_time: '00:00:05,200',
        kazakh_text: 'Қазақстанға қош келдіңіз!',
        english_text: 'Welcome to Kazakhstan!',
      },
      {
        start_time: '00:00:05,500',
        end_time: '00:00:08,200',
        kazakh_text: 'Бүгін ауа райы өте тамаша, күн жылы болып тұр.',
        english_text: 'The weather today is wonderful, and the sun is warm.',
      },
    ],
  },
  {
    id: 'proverb',
    title: 'Мақал-мәтел (Proverbe kazakh sur le savoir)',
    description: 'Proverbe traditionnel illustrant la sagesse nomade kazakhe.',
    duration: '0:07',
    kazakhSampleText: 'Оқу – білім бұлағы, білім – өмір шырағы. Тіл байлығы – ел байлығы.',
    englishTranslation: 'Study is the fountain of knowledge, knowledge is the lantern of life. The richness of language is the wealth of the nation.',
    notes: 'Style parémiologique classique. Remarquez l\'utilisation de [ұ] dans «бұлағы», [ө] dans «өмір», et [і] dans «білім».',
    segments: [
      {
        start_time: '00:00:00,800',
        end_time: '00:00:04,100',
        kazakh_text: 'Оқу – білім бұлағы, білім – өмір шырағы.',
        english_text: 'Study is the fountain of knowledge, knowledge is the lantern of life.',
      },
      {
        start_time: '00:00:04,300',
        end_time: '00:00:07,000',
        kazakh_text: 'Тіл байлығы – ел байлығы.',
        english_text: 'The richness of language is the wealth of the nation.',
      },
    ],
  },
  {
    id: 'interview',
    title: 'Қала өмірі мен жұмыс (Vie citadine & code-switching)',
    description: 'Extrait moderne avec alternance de code courante (code-switching kazakh-russe).',
    duration: '0:10',
    kazakhSampleText: 'Бүгін кеңсеге метромен бардым. Проект бойынша жиналыс сағат үште басталады, соған дайындалып жатырмын.',
    englishTranslation: 'Today I went to the office by metro. The meeting about the project starts at three o\'clock, so I am preparing for it.',
    notes: 'Exemple représentatif de la vie contemporaine à Almaty / Astana : emprunts lexicaux au russe intégrés («метромен», «проект»), avec déclinaisons grammaticales kazakhes respectées (-мен pour le cas instrumental).',
    segments: [
      {
        start_time: '00:00:00,400',
        end_time: '00:00:03,600',
        kazakh_text: 'Бүгін кеңсеге метромен бардым.',
        english_text: 'Today I went to the office by metro.',
      },
      {
        start_time: '00:00:03,900',
        end_time: '00:00:09,800',
        kazakh_text: 'Проект бойынша жиналыс сағат үште басталады, соған дайындалып жатырмын.',
        english_text: 'The meeting about the project starts at three o\'clock, so I am preparing for it.',
      },
    ],
  },
];
