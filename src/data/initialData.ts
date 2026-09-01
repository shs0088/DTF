import { Product, Design, DesignerProfile, Order, BusinessSettings, AppNotification, CategoryItem, CustomerRecord, CouponCode } from '../types';

import astronautArt from '../assets/images/dtf_astronaut_art_1787997492003.jpg';
import wolfNightArt from '../assets/images/dtf_wolf_night_1787997565583.jpg';
import samuraiArt from '../assets/images/dtf_samurai_art_1787997506959.jpg';
import lionArt from '../assets/images/dtf_lion_art_1787997520853.jpg';
import skullRosesArt from '../assets/images/dtf_skull_roses_1787997534091.jpg';
import teddyDripArt from '../assets/images/dtf_teddy_drip_1787997550447.jpg';

import tshirtBlackMockup from '../assets/images/dtf_tshirt_black_1787997579933.jpg';
import tshirtModelMockup from '../assets/images/dtf_tshirt_model_1787997600643.jpg';
import ceramicMugMockup from '../assets/images/dtf_ceramic_mug_1787997615431.jpg';
import snapbackCapMockup from '../assets/images/dtf_snapback_cap_1787997629728.jpg';
import hoodieBlackMockup from '../assets/images/dtf_hoodie_black_1787997653191.jpg';

export {
  astronautArt,
  wolfNightArt,
  samuraiArt,
  lionArt,
  skullRosesArt,
  teddyDripArt,
  tshirtBlackMockup,
  tshirtModelMockup,
  ceramicMugMockup,
  snapbackCapMockup,
  hoodieBlackMockup,
};

export const INITIAL_DESIGNS: Design[] = [
  {
    id: 'design_astronaut',
    title: 'Astronaut Cosmic',
    titleAr: 'رائد الفضاء الكوني',
    description: 'High-definition cyberpunk astronaut in deep space with neon nebula reflections, optimized for dark apparel.',
    descriptionAr: 'رائد فضاء سايبربانك في الفضاء السحيق مع انعكاسات سديم نيون متألقة، مصمم خصيصاً للملابس الداكنة.',
    designerId: 'designer_1',
    designerName: 'Astro Moh',
    designerAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
    imageUrl: astronautArt,
    presentationPhotos: [
      astronautArt,
      tshirtBlackMockup,
      hoodieBlackMockup,
      snapbackCapMockup
    ],
    supportingFiles: [
      { id: 'sf_1', name: 'astronaut_master.psd', format: 'psd', url: astronautArt, sizeBytes: 18450000 },
      { id: 'sf_2', name: 'astronaut_vector.ai', format: 'ai', url: astronautArt, sizeBytes: 8200000 },
      { id: 'sf_3', name: 'astronaut_ready_print.png', format: 'png', url: astronautArt, sizeBytes: 4600000, isReadyToPrint: true }
    ],
    assets: [
      {
        id: 'ast_des1_master',
        name: 'astronaut_ready_print.png',
        assetType: 'ready_to_print_master',
        format: 'png',
        url: astronautArt,
        sizeBytes: 4600000,
        sizeFormatted: '4.6 MB',
        isReadyToPrintMaster: true,
        uploadedAt: '2026-08-10T12:00:00Z',
        preflightResult: {
          passed: true,
          dpi: 300,
          widthPx: 3600,
          heightPx: 4500,
          hasTransparency: true,
          targetWidthCm: 30.48,
          targetHeightCm: 38.10,
          score: 98,
          notesEn: '300 DPI lossless PNG with alpha transparency. Certified for direct-to-film printing.',
          notesAr: 'ملف PNG عالي الدقة 300 DPI مع خلفية شفافة نقية.'
        }
      },
      {
        id: 'ast_des1_psd',
        name: 'astronaut_master.psd',
        assetType: 'source_file',
        format: 'psd',
        url: astronautArt,
        sizeBytes: 18450000,
        sizeFormatted: '18.45 MB',
        isReadyToPrintMaster: false,
        uploadedAt: '2026-08-10T12:00:00Z'
      },
      {
        id: 'ast_des1_ai',
        name: 'astronaut_vector.ai',
        assetType: 'source_file',
        format: 'ai',
        url: astronautArt,
        sizeBytes: 8200000,
        sizeFormatted: '8.20 MB',
        isReadyToPrintMaster: false,
        uploadedAt: '2026-08-10T12:00:00Z'
      },
      {
        id: 'ast_des1_shot1',
        name: 'presentation_front_tshirt.jpg',
        assetType: 'presentation_image',
        format: 'jpg',
        url: tshirtBlackMockup,
        isReadyToPrintMaster: false
      },
      {
        id: 'ast_des1_shot2',
        name: 'presentation_hoodie.jpg',
        assetType: 'presentation_image',
        format: 'jpg',
        url: hoodieBlackMockup,
        isReadyToPrintMaster: false
      },
      {
        id: 'ast_des1_shot3',
        name: 'presentation_cap.jpg',
        assetType: 'presentation_image',
        format: 'jpg',
        url: snapbackCapMockup,
        isReadyToPrintMaster: false
      }
    ],
    readyToPrintFile: {
      url: astronautArt,
      fileName: 'astronaut_ready_print.png',
      format: 'png',
      widthPx: 3600,
      heightPx: 4500,
      dpi: 300,
      hasTransparency: true,
      targetPhysicalWidthCm: 30.48,
      targetPhysicalHeightCm: 38.10,
      edgeClarityScore: 98,
      pixelationRisk: 'none',
      dtfSuitabilityPass: true,
      inspectionNotes: '300 DPI lossless PNG with alpha transparency channel. Suitable for print up to 35x45 cm.',
      inspectionNotesAr: 'ملف PNG عالي الدقة 300 DPI مع خلفية شفافة نقية. مناسب للطباعة بمقاس يصل إلى 35×45 سم.'
    },
    fileFormat: 'png',
    category: 'popular',
    tags: ['space', 'astronaut', 'neon', 'sci-fi', 'men', 'unisex'],
    soldCount: 78,
    usedCount: 142,
    royaltyRate: 0.50,
    pricePerUnit: 0.50,
    royaltyType: 'fixed',
    status: 'published',
    createdAt: '2026-08-10T12:00:00Z',
    hasTransparency: true,
    resolutionDpi: 300,
    aspectRatio: 0.8,
  },
  {
    id: 'design_owner_dtf_signature',
    title: 'DTF Studio Signature Crown',
    titleAr: 'تاج DTF Studio الذهبي الحصري (تصميم المتجر)',
    description: 'Exclusive in-house master print crafted directly by DTF Studio Creative Lab (0% designer commission).',
    descriptionAr: 'تصميم حصري من إبداع استوديو DTF الداخلي بدون عمولة طرف ثالث.',
    designerId: 'owner_inhouse',
    designerName: 'DTF Studio Creative Lab',
    designerAvatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&q=80',
    isOwnerDesign: true, // Owner-owned design has NO third-party commission
    imageUrl: lionArt,
    presentationPhotos: [
      lionArt,
      tshirtBlackMockup,
      ceramicMugMockup,
      hoodieBlackMockup
    ],
    supportingFiles: [
      { id: 'sf_own_1', name: 'dtf_crown_master.ai', format: 'ai', url: lionArt, sizeBytes: 12400000 },
      { id: 'sf_own_2', name: 'dtf_crown_print.png', format: 'png', url: lionArt, sizeBytes: 5100000, isReadyToPrint: true }
    ],
    assets: [
      {
        id: 'ast_own_master',
        name: 'dtf_crown_print.png',
        assetType: 'ready_to_print_master',
        format: 'png',
        url: lionArt,
        sizeBytes: 5100000,
        sizeFormatted: '5.1 MB',
        isReadyToPrintMaster: true,
        uploadedAt: '2026-08-01T10:00:00Z',
        preflightResult: {
          passed: true,
          dpi: 300,
          widthPx: 4200,
          heightPx: 4800,
          hasTransparency: true,
          targetWidthCm: 35.0,
          targetHeightCm: 40.0,
          score: 100,
          notesEn: 'Studio in-house vector rendered at 300 DPI. 0 JD designer royalty.',
          notesAr: 'تصميم داخلي من المتجر بدقة 300 DPI. بدون عمولة وسيط.'
        }
      },
      {
        id: 'ast_own_ai',
        name: 'dtf_crown_master.ai',
        assetType: 'source_file',
        format: 'ai',
        url: lionArt,
        sizeBytes: 12400000,
        sizeFormatted: '12.4 MB',
        isReadyToPrintMaster: false,
        uploadedAt: '2026-08-01T10:00:00Z'
      },
      {
        id: 'ast_own_shot1',
        name: 'presentation_tshirt.jpg',
        assetType: 'presentation_image',
        format: 'jpg',
        url: tshirtBlackMockup,
        isReadyToPrintMaster: false
      },
      {
        id: 'ast_own_shot2',
        name: 'presentation_mug.jpg',
        assetType: 'presentation_image',
        format: 'jpg',
        url: ceramicMugMockup,
        isReadyToPrintMaster: false
      }
    ],
    readyToPrintFile: {
      url: lionArt,
      fileName: 'dtf_crown_print.png',
      format: 'png',
      widthPx: 4200,
      heightPx: 4800,
      dpi: 300,
      hasTransparency: true,
      targetPhysicalWidthCm: 35.0,
      targetPhysicalHeightCm: 40.0,
      edgeClarityScore: 100,
      pixelationRisk: 'none',
      dtfSuitabilityPass: true,
      inspectionNotes: 'Studio in-house vector rendered at 300 DPI. 0 JD designer royalty.',
      inspectionNotesAr: 'تصميم داخلي من المتجر بدقة 300 DPI. بدون عمولة وسيط.'
    },
    fileFormat: 'png',
    category: 'popular',
    tags: ['lion', 'crown', 'gold', 'royal', 'inhouse', 'signature'],
    soldCount: 95,
    usedCount: 160,
    royaltyRate: 0.00,
    pricePerUnit: 0.00,
    royaltyType: 'fixed',
    status: 'published',
    createdAt: '2026-08-01T10:00:00Z',
    hasTransparency: true,
    resolutionDpi: 300,
    aspectRatio: 0.85,
  },
  {
    id: 'design_wolf_night',
    title: 'Wolf Night Moon',
    titleAr: 'ذئب القمر الساطع',
    description: 'Mystic howling wolf against a luminous full moon in the pine forest.',
    descriptionAr: 'ذئب يعوي تحت ضوء القمر الكامل الساطع في غابة الصنوبر.',
    designerId: 'designer_5',
    designerName: 'Sara K',
    designerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    imageUrl: wolfNightArt,
    presentationPhotos: [
      wolfNightArt,
      tshirtBlackMockup,
      ceramicMugMockup
    ],
    supportingFiles: [
      { id: 'sf_wn_1', name: 'wolf_night.psd', format: 'psd', url: wolfNightArt, sizeBytes: 15200000 },
      { id: 'sf_wn_2', name: 'wolf_night_ready.png', format: 'png', url: wolfNightArt, sizeBytes: 3900000, isReadyToPrint: true }
    ],
    assets: [
      {
        id: 'ast_wn_master',
        name: 'wolf_night_ready.png',
        assetType: 'ready_to_print_master',
        format: 'png',
        url: wolfNightArt,
        sizeBytes: 3900000,
        sizeFormatted: '3.9 MB',
        isReadyToPrintMaster: true,
        uploadedAt: '2026-08-16T11:20:00Z',
        preflightResult: {
          passed: true,
          dpi: 300,
          widthPx: 3000,
          heightPx: 3750,
          hasTransparency: true,
          targetWidthCm: 25.4,
          targetHeightCm: 31.75,
          score: 96,
          notesEn: 'Passed 300 DPI DTF print check.',
          notesAr: 'اجتاز فحص الجودة 300 DPI لطباعة DTF.'
        }
      },
      {
        id: 'ast_wn_psd',
        name: 'wolf_night.psd',
        assetType: 'source_file',
        format: 'psd',
        url: wolfNightArt,
        sizeBytes: 15200000,
        sizeFormatted: '15.2 MB',
        isReadyToPrintMaster: false,
        uploadedAt: '2026-08-16T11:20:00Z'
      }
    ],
    readyToPrintFile: {
      url: wolfNightArt,
      fileName: 'wolf_night_ready.png',
      format: 'png',
      widthPx: 3000,
      heightPx: 3750,
      dpi: 300,
      hasTransparency: true,
      targetPhysicalWidthCm: 25.4,
      targetPhysicalHeightCm: 31.75,
      edgeClarityScore: 96,
      pixelationRisk: 'none',
      dtfSuitabilityPass: true,
      inspectionNotes: 'Passed 300 DPI DTF print check.',
      inspectionNotesAr: 'اجتاز فحص الجودة 300 DPI لطباعة DTF.'
    },
    fileFormat: 'png',
    category: 'popular',
    tags: ['wolf', 'moon', 'night', 'forest', 'nature'],
    soldCount: 41,
    usedCount: 65,
    royaltyRate: 0.50,
    pricePerUnit: 0.50,
    royaltyType: 'fixed',
    status: 'published',
    createdAt: '2026-08-16T11:20:00Z',
    hasTransparency: true,
    resolutionDpi: 300,
    aspectRatio: 0.8,
  },
  {
    id: 'design_samurai',
    title: 'Samurai Bushido',
    titleAr: 'الساموراي الياباني',
    description: 'Traditional Japanese samurai warrior with rising sun and cherry blossoms.',
    descriptionAr: 'محارب الساموراي الياباني التقليدي مع شمس الصباح وأزهار الكرز.',
    designerId: 'designer_3',
    designerName: 'Rashed Ink',
    designerAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    imageUrl: samuraiArt,
    presentationPhotos: [
      samuraiArt,
      tshirtBlackMockup,
      snapbackCapMockup
    ],
    supportingFiles: [
      { id: 'sf_sam_1', name: 'samurai_vector.ai', format: 'ai', url: samuraiArt, sizeBytes: 9400000 },
      { id: 'sf_sam_2', name: 'samurai_print.png', format: 'png', url: samuraiArt, sizeBytes: 4200000, isReadyToPrint: true }
    ],
    assets: [
      {
        id: 'ast_sam_master',
        name: 'samurai_print.png',
        assetType: 'ready_to_print_master',
        format: 'png',
        url: samuraiArt,
        sizeBytes: 4200000,
        sizeFormatted: '4.2 MB',
        isReadyToPrintMaster: true,
        uploadedAt: '2026-08-14T09:15:00Z',
        preflightResult: {
          passed: true,
          dpi: 300,
          widthPx: 3200,
          heightPx: 3900,
          hasTransparency: true,
          targetWidthCm: 27.0,
          targetHeightCm: 33.0,
          score: 97,
          notesEn: 'Crisp vector rasterization at 300 DPI.',
          notesAr: 'دقة متناهية 300 DPI لطباعة القماش.'
        }
      },
      {
        id: 'ast_sam_ai',
        name: 'samurai_vector.ai',
        assetType: 'source_file',
        format: 'ai',
        url: samuraiArt,
        sizeBytes: 9400000,
        sizeFormatted: '9.4 MB',
        isReadyToPrintMaster: false,
        uploadedAt: '2026-08-14T09:15:00Z'
      }
    ],
    readyToPrintFile: {
      url: samuraiArt,
      fileName: 'samurai_print.png',
      format: 'png',
      widthPx: 3200,
      heightPx: 3900,
      dpi: 300,
      hasTransparency: true,
      targetPhysicalWidthCm: 27.0,
      targetPhysicalHeightCm: 33.0,
      edgeClarityScore: 97,
      pixelationRisk: 'none',
      dtfSuitabilityPass: true,
      inspectionNotes: 'Crisp vector rasterization at 300 DPI.',
      inspectionNotesAr: 'دقة متناهية 300 DPI لطباعة القماش.'
    },
    fileFormat: 'png',
    category: 'men',
    tags: ['samurai', 'japan', 'red sun', 'warrior', 'anime'],
    soldCount: 47,
    usedCount: 84,
    royaltyRate: 0.50,
    pricePerUnit: 0.50,
    royaltyType: 'fixed',
    status: 'published',
    createdAt: '2026-08-14T09:15:00Z',
    hasTransparency: true,
    resolutionDpi: 300,
    aspectRatio: 0.82,
  },
  {
    id: 'design_skull_roses',
    title: 'Gothic Skull & Crimson Roses',
    titleAr: 'الجمجمة والورود الحمراء',
    description: 'Detailed vintage gothic skull intertwined with blooming crimson roses.',
    descriptionAr: 'جمجمة قوطية كلاسيكية متداخلة مع ورود حمراء مخملية.',
    designerId: 'designer_4',
    designerName: 'Luna Prints',
    designerAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
    imageUrl: skullRosesArt,
    presentationPhotos: [
      skullRosesArt,
      tshirtBlackMockup,
      ceramicMugMockup
    ],
    supportingFiles: [
      { id: 'sf_sk_1', name: 'skull_roses.psd', format: 'psd', url: skullRosesArt, sizeBytes: 16800000 },
      { id: 'sf_sk_2', name: 'skull_roses_print.png', format: 'png', url: skullRosesArt, sizeBytes: 4800000, isReadyToPrint: true }
    ],
    assets: [
      {
        id: 'ast_sk_master',
        name: 'skull_roses_print.png',
        assetType: 'ready_to_print_master',
        format: 'png',
        url: skullRosesArt,
        sizeBytes: 4800000,
        sizeFormatted: '4.8 MB',
        isReadyToPrintMaster: true,
        uploadedAt: '2026-08-15T16:45:00Z',
        preflightResult: {
          passed: true,
          dpi: 300,
          widthPx: 3400,
          heightPx: 3860,
          hasTransparency: true,
          targetWidthCm: 28.7,
          targetHeightCm: 32.6,
          score: 99,
          notesEn: 'Passed full transparency and edge check.',
          notesAr: 'اجتاز فحص الشفافية وحواف الطباعة بدقة 300 DPI.'
        }
      },
      {
        id: 'ast_sk_psd',
        name: 'skull_roses.psd',
        assetType: 'source_file',
        format: 'psd',
        url: skullRosesArt,
        sizeBytes: 16800000,
        sizeFormatted: '16.8 MB',
        isReadyToPrintMaster: false,
        uploadedAt: '2026-08-15T16:45:00Z'
      }
    ],
    readyToPrintFile: {
      url: skullRosesArt,
      fileName: 'skull_roses_print.png',
      format: 'png',
      widthPx: 3400,
      heightPx: 3860,
      dpi: 300,
      hasTransparency: true,
      targetPhysicalWidthCm: 28.7,
      targetPhysicalHeightCm: 32.6,
      edgeClarityScore: 99,
      pixelationRisk: 'none',
      dtfSuitabilityPass: true,
      inspectionNotes: 'Passed full transparency and edge check.',
      inspectionNotesAr: 'اجتاز فحص الشفافية وحواف الطباعة بدقة 300 DPI.'
    },
    fileFormat: 'png',
    category: 'women',
    tags: ['skull', 'roses', 'gothic', 'tattoo', 'vintage'],
    soldCount: 39,
    usedCount: 71,
    royaltyRate: 0.50,
    pricePerUnit: 0.50,
    royaltyType: 'fixed',
    status: 'published',
    createdAt: '2026-08-15T16:45:00Z',
    hasTransparency: true,
    resolutionDpi: 300,
    aspectRatio: 0.88,
  },
  {
    id: 'design_teddy_drip',
    title: 'Urban Teddy Drip',
    titleAr: 'تيدي الهيب هوب العصري',
    description: 'Streetwear cartoon teddy bear with gold chain and sneakers.',
    descriptionAr: 'دب تيدي كرتوني بستايل الهيب هوب مع سلسلة ذهبية وحذاء رياضي.',
    designerId: 'designer_6',
    designerName: 'Kids Lab',
    designerAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
    imageUrl: teddyDripArt,
    presentationPhotos: [
      teddyDripArt,
      tshirtBlackMockup,
      hoodieBlackMockup
    ],
    supportingFiles: [
      { id: 'sf_td_1', name: 'teddy_drip.ai', format: 'ai', url: teddyDripArt, sizeBytes: 7800000 },
      { id: 'sf_td_2', name: 'teddy_drip_print.png', format: 'png', url: teddyDripArt, sizeBytes: 3600000, isReadyToPrint: true }
    ],
    assets: [
      {
        id: 'ast_td_master',
        name: 'teddy_drip_print.png',
        assetType: 'ready_to_print_master',
        format: 'png',
        url: teddyDripArt,
        sizeBytes: 3600000,
        sizeFormatted: '3.6 MB',
        isReadyToPrintMaster: true,
        uploadedAt: '2026-08-18T14:10:00Z',
        preflightResult: {
          passed: true,
          dpi: 300,
          widthPx: 3000,
          heightPx: 3500,
          hasTransparency: true,
          targetWidthCm: 25.4,
          targetHeightCm: 29.6,
          score: 98,
          notesEn: 'Passed 300 DPI vector DTF check.',
          notesAr: 'اجتاز فحص الدقة 300 DPI.'
        }
      },
      {
        id: 'ast_td_ai',
        name: 'teddy_drip.ai',
        assetType: 'source_file',
        format: 'ai',
        url: teddyDripArt,
        sizeBytes: 7800000,
        sizeFormatted: '7.8 MB',
        isReadyToPrintMaster: false,
        uploadedAt: '2026-08-18T14:10:00Z'
      }
    ],
    readyToPrintFile: {
      url: teddyDripArt,
      fileName: 'teddy_drip_print.png',
      format: 'png',
      widthPx: 3000,
      heightPx: 3500,
      dpi: 300,
      hasTransparency: true,
      targetPhysicalWidthCm: 25.4,
      targetPhysicalHeightCm: 29.6,
      edgeClarityScore: 98,
      pixelationRisk: 'none',
      dtfSuitabilityPass: true,
      inspectionNotes: 'Passed 300 DPI vector DTF check.',
      inspectionNotesAr: 'اجتاز فحص الدقة 300 DPI.'
    },
    fileFormat: 'png',
    category: 'kids',
    tags: ['teddy', 'streetwear', 'kids', 'cute', 'cartoon'],
    soldCount: 33,
    usedCount: 59,
    royaltyRate: 0.50,
    pricePerUnit: 0.50,
    royaltyType: 'fixed',
    status: 'published',
    createdAt: '2026-08-18T14:10:00Z',
    hasTransparency: true,
    resolutionDpi: 300,
    aspectRatio: 0.85,
  }
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod_tshirt',
    name: 'Classic T-Shirt',
    nameAr: 'تيشيرت كلاسيك بريميوم',
    description: 'Heavyweight 100% combed ring-spun cotton t-shirt engineered specifically for direct-to-film (DTF) vibrancy and maximum wash durability.',
    descriptionAr: 'تيشيرت قطن فاخر 100% عالي الكثافة مصمم خصيصاً لطباعة DTF فائقة الثبات والنعومة.',
    type: 'ready_to_sell',
    basePrice: 12.99,
    rating: 4.9,
    reviewsCount: 128,
    isBestSeller: true,
    category: 't_shirts',
    tags: ['tshirt', 'cotton', 'apparel', 'bestseller'],
    images: {
      primary: tshirtBlackMockup,
      model: tshirtModelMockup,
      back: tshirtBlackMockup,
    },
    colors: [
      { name: 'Black', hex: '#0B0F17' },
      { name: 'White', hex: '#F8FAFC' },
      { name: 'Navy', hex: '#1E293B' },
      { name: 'Heather Gray', hex: '#64748B' },
      { name: 'Crimson Red', hex: '#991B1B' }
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    stock: 240,
    features: [
      'Premium quality combed ring-spun cotton',
      'Vibrant & long-lasting high-resolution DTF print',
      'Wash durable, fade-proof & stretch resistant',
      'Double-stitched neckline and hem'
    ],
    featuresAr: [
      'خامات قطنية فاخرة 100% مغزولة بحلقات ناعمة',
      'طباعة DTF عالية الدقة بألوان فائقة الإشراق',
      'مقاوم للغسيل والبهتان وتمدد القماش',
      'حياكة مزدوجة متينة للياقة والأكمام'
    ],
    printableAreas: [
      {
        location: 'front',
        name: 'Front Chest',
        maxWidthCm: 35,
        maxHeightCm: 45,
        defaultWidthCm: 25,
        defaultHeightCm: 30,
        centerXPercent: 50,
        centerYPercent: 44,
        aspectRatio: 0.8
      },
      {
        location: 'back',
        name: 'Full Back',
        maxWidthCm: 35,
        maxHeightCm: 48,
        defaultWidthCm: 28,
        defaultHeightCm: 35,
        centerXPercent: 50,
        centerYPercent: 45,
        aspectRatio: 0.8
      },
      {
        location: 'left_sleeve',
        name: 'Left Sleeve',
        maxWidthCm: 10,
        maxHeightCm: 15,
        defaultWidthCm: 8,
        defaultHeightCm: 8,
        centerXPercent: 50,
        centerYPercent: 50,
        aspectRatio: 1.0
      },
      {
        location: 'right_sleeve',
        name: 'Right Sleeve',
        maxWidthCm: 10,
        maxHeightCm: 15,
        defaultWidthCm: 8,
        defaultHeightCm: 8,
        centerXPercent: 50,
        centerYPercent: 50,
        aspectRatio: 1.0
      }
    ],
    defaultDesignId: 'design_lion_king',
    variants: [
      { id: 'v_tshirt_blk_m', name: 'Black / M', color: '#0B0F17', colorName: 'Black', size: 'M', sku: 'TS-BLK-M', stock: 50 },
      { id: 'v_tshirt_blk_l', name: 'Black / L', color: '#0B0F17', colorName: 'Black', size: 'L', sku: 'TS-BLK-L', stock: 45 },
      { id: 'v_tshirt_blk_xl', name: 'Black / XL', color: '#0B0F17', colorName: 'Black', size: 'XL', sku: 'TS-BLK-XL', stock: 35 },
      { id: 'v_tshirt_wht_m', name: 'White / M', color: '#F8FAFC', colorName: 'White', size: 'M', sku: 'TS-WHT-M', stock: 30 }
    ]
  },
  {
    id: 'prod_mug',
    name: 'Photo Mug',
    nameAr: 'مج سيراميك فاخر',
    description: 'High-gloss AAA grade ceramic mug with double-coat DTF curing for maximum thermal retention and dishwasher safety.',
    descriptionAr: 'مج سيراميك عالي اللمعان والصلابة مطلي بطبقة مقاومة للحرارة العالية وغسالة الصحون.',
    type: 'ready_to_sell',
    basePrice: 8.99,
    rating: 4.8,
    reviewsCount: 84,
    category: 'mugs',
    tags: ['mug', 'ceramic', 'kitchen', 'gift'],
    images: {
      primary: ceramicMugMockup,
    },
    colors: [
      { name: 'Black Gloss', hex: '#0F172A' },
      { name: 'Pure White', hex: '#FFFFFF' },
      { name: 'Matte Blue', hex: '#1E3A8A' }
    ],
    stock: 180,
    features: [
      '11oz premium ceramic build',
      'Dishwasher & microwave safe',
      'Full wrap 360-degree vibrant DTF print capability'
    ],
    featuresAr: [
      'سعة 11 أونصة من السيراميك المعالج',
      'آمن للاستخدام في الميكروويف وغسالة الأطباق',
      'إمكانية الطباعة الدائرية الكاملة بألوان زاهية'
    ],
    printableAreas: [
      {
        location: 'front',
        name: 'Center Display',
        maxWidthCm: 9,
        maxHeightCm: 8.5,
        defaultWidthCm: 8,
        defaultHeightCm: 8,
        centerXPercent: 50,
        centerYPercent: 50,
        aspectRatio: 1.0
      },
      {
        location: 'left',
        name: 'Left Side (Facing Right Hand)',
        maxWidthCm: 9,
        maxHeightCm: 8.5,
        defaultWidthCm: 8,
        defaultHeightCm: 8,
        centerXPercent: 40,
        centerYPercent: 50,
        aspectRatio: 1.0
      },
      {
        location: 'right',
        name: 'Right Side (Facing Left Hand)',
        maxWidthCm: 9,
        maxHeightCm: 8.5,
        defaultWidthCm: 8,
        defaultHeightCm: 8,
        centerXPercent: 60,
        centerYPercent: 50,
        aspectRatio: 1.0
      }
    ],
    defaultDesignId: 'design_skull_roses',
    variants: [
      { id: 'v_mug_blk', name: 'Black Gloss', color: '#0F172A', colorName: 'Black Gloss', sku: 'MUG-BLK-11', stock: 90 },
      { id: 'v_mug_wht', name: 'Pure White', color: '#FFFFFF', colorName: 'Pure White', sku: 'MUG-WHT-11', stock: 90 }
    ]
  },
  {
    id: 'prod_cap',
    name: 'Snapback Cap',
    nameAr: 'كاب سناب باك مطرز ومطبوع',
    description: 'Structured 6-panel flat-brim snapback hat with rigid front buckram optimized for high-definition front heat transfer.',
    descriptionAr: 'قبعة سناب باك عصرية بـ 6 أجزاء مع مقدمة مقواة مهيأة لطباعة DTF الدقيقة والتطريز.',
    type: 'ready_to_sell',
    basePrice: 11.99,
    rating: 4.7,
    reviewsCount: 65,
    category: 'caps',
    tags: ['cap', 'hat', 'streetwear', 'headwear'],
    images: {
      primary: snapbackCapMockup,
    },
    colors: [
      { name: 'Deep Black', hex: '#0B0F17' },
      { name: 'Charcoal', hex: '#334155' },
      { name: 'Royal Blue', hex: '#1D4ED8' }
    ],
    sizes: ['One Size (Adjustable Snap)'],
    stock: 120,
    features: [
      'Structured 6-panel silhouette',
      'Classic snapback closure fitting all sizes',
      'Reinforced front panel for sharp print clarity'
    ],
    featuresAr: [
      'تصميم مقوى بـ 6 ألواح أنيقة',
      'إغلاق سناب باك خلفي قابل للتعديل لجميع المقاسات',
      'سطح أمامي ثابت يمنح دقة طباعة لا متناهية'
    ],
    printableAreas: [
      {
        location: 'front',
        name: 'Front Center',
        maxWidthCm: 12,
        maxHeightCm: 7,
        defaultWidthCm: 10,
        defaultHeightCm: 6,
        centerXPercent: 50,
        centerYPercent: 48,
        aspectRatio: 1.6
      },
      {
        location: 'left',
        name: 'Left Side',
        maxWidthCm: 6,
        maxHeightCm: 4.5,
        defaultWidthCm: 5,
        defaultHeightCm: 4,
        centerXPercent: 35,
        centerYPercent: 50,
        aspectRatio: 1.25
      },
      {
        location: 'right',
        name: 'Right Side',
        maxWidthCm: 6,
        maxHeightCm: 4.5,
        defaultWidthCm: 5,
        defaultHeightCm: 4,
        centerXPercent: 65,
        centerYPercent: 50,
        aspectRatio: 1.25
      }
    ],
    defaultDesignId: 'design_samurai',
    variants: [
      { id: 'v_cap_blk', name: 'Deep Black / OS', color: '#0B0F17', colorName: 'Deep Black', size: 'One Size', sku: 'CAP-BLK-OS', stock: 70 },
      { id: 'v_cap_chr', name: 'Charcoal / OS', color: '#334155', colorName: 'Charcoal', size: 'One Size', sku: 'CAP-CHR-OS', stock: 50 }
    ]
  },
  {
    id: 'prod_hoodie',
    name: 'Heavyweight Hoodie',
    nameAr: 'هودي شتوي ثقيل بريميوم',
    description: 'Ultra-plush 380 GSM fleece hoodie with 3-panel hood and double needle stitching, ideal for large full-back DTF prints.',
    descriptionAr: 'هودي شتوي فاخر عالي السماكة 380 غرام مع قبعة ثلاثية وحياكة مقواة مناسب لطباعات الظهر الكبيرة.',
    type: 'ready_to_sell',
    basePrice: 24.99,
    rating: 4.9,
    reviewsCount: 94,
    category: 'hoodies',
    tags: ['hoodie', 'fleece', 'winter', 'warm'],
    images: {
      primary: hoodieBlackMockup,
    },
    colors: [
      { name: 'Onyx Black', hex: '#0B0F17' },
      { name: 'Heather Gray', hex: '#64748B' },
      { name: 'Forest Green', hex: '#14532D' },
      { name: 'Warm Sand', hex: '#D97706' }
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    stock: 85,
    features: [
      '380 GSM heavyweight cotton fleece',
      'Spacious kangaroo pocket with hidden earphone opening',
      'Thick elastic ribbed cuffs and hem'
    ],
    featuresAr: [
      'صوف قطني ثقيل فاخر 380 غرام/م²',
      'جيب كانغرو أمامي واسع مع مخرج سماعات مخفي',
      'أساور وحاشية مرنة مضلعة عالية الجودة'
    ],
    printableAreas: [
      {
        location: 'front',
        name: 'Center Chest',
        maxWidthCm: 32,
        maxHeightCm: 35,
        defaultWidthCm: 25,
        defaultHeightCm: 25,
        centerXPercent: 50,
        centerYPercent: 40,
        aspectRatio: 1.0
      },
      {
        location: 'back',
        name: 'Full Back',
        maxWidthCm: 35,
        maxHeightCm: 48,
        defaultWidthCm: 30,
        defaultHeightCm: 38,
        centerXPercent: 50,
        centerYPercent: 46,
        aspectRatio: 0.8
      }
    ],
    defaultDesignId: 'design_lion_king',
    variants: [
      { id: 'v_hoodie_blk_l', name: 'Onyx Black / L', color: '#0B0F17', colorName: 'Onyx Black', size: 'L', sku: 'HD-BLK-L', stock: 35 },
      { id: 'v_hoodie_blk_xl', name: 'Onyx Black / XL', color: '#0B0F17', colorName: 'Onyx Black', size: 'XL', sku: 'HD-BLK-XL', stock: 25 }
    ]
  },
  {
    id: 'prod_tshirt_blank',
    name: 'Blank Classic T-Shirt',
    nameAr: 'تيشيرت كلاسيك سادة (خام)',
    description: '100% Ring-spun heavyweight cotton blank canvas ready for your custom DTF design artwork or personal logo.',
    descriptionAr: 'تيشيرت قطن فاخر سادة جاهز لإضافة وطباعة تصميمك الخاص بتقنية DTF فائقة الثبات.',
    type: 'blank',
    basePrice: 8.50,
    rating: 4.9,
    reviewsCount: 140,
    isBestSeller: true,
    category: 't_shirts',
    tags: ['blank', 'tshirt', 'plain', 'cotton'],
    images: {
      primary: tshirtBlackMockup,
      model: tshirtModelMockup,
      back: tshirtBlackMockup,
    },
    colors: [
      { name: 'Black', hex: '#0B0F17' },
      { name: 'White', hex: '#F8FAFC' },
      { name: 'Navy', hex: '#1E293B' },
      { name: 'Heather Gray', hex: '#64748B' },
      { name: 'Crimson Red', hex: '#991B1B' }
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    stock: 350,
    features: [
      '100% Combed ring-spun cotton',
      'Smooth surface optimized for Direct-To-Film adhesion',
      'Pre-shrunk, wash-durable fabric',
      'Double-needle sleeve and bottom hem'
    ],
    featuresAr: [
      'قطن ناعم 100% مغزول بحلقات ممشطة',
      'سطح معالج لتحقيق أعلى درجات ثبات حبر DTF',
      'قماش معالج ضد الانكماش والبهتان',
      'حياكة مزدوجة متينة'
    ],
    printableAreas: [
      {
        location: 'front',
        name: 'Front Chest',
        maxWidthCm: 35,
        maxHeightCm: 45,
        defaultWidthCm: 25,
        defaultHeightCm: 30,
        centerXPercent: 50,
        centerYPercent: 44,
        aspectRatio: 0.8
      },
      {
        location: 'back',
        name: 'Full Back',
        maxWidthCm: 35,
        maxHeightCm: 48,
        defaultWidthCm: 28,
        defaultHeightCm: 35,
        centerXPercent: 50,
        centerYPercent: 45,
        aspectRatio: 0.8
      }
    ],
    variants: [
      { id: 'v_tblk_m', name: 'Black / M', color: '#0B0F17', colorName: 'Black', size: 'M', sku: 'B-TS-BLK-M', stock: 80 },
      { id: 'v_tblk_l', name: 'Black / L', color: '#0B0F17', colorName: 'Black', size: 'L', sku: 'B-TS-BLK-L', stock: 75 },
      { id: 'v_twht_m', name: 'White / M', color: '#F8FAFC', colorName: 'White', size: 'M', sku: 'B-TS-WHT-M', stock: 60 }
    ]
  },
  {
    id: 'prod_mug_blank',
    name: 'Blank Ceramic Mug',
    nameAr: 'مج سيراميك سادة (خام)',
    description: 'AAA Grade 11oz high-gloss ceramic mug prepared for custom DTF / sublimation printing transfers.',
    descriptionAr: 'مج سيراميك لامع فاخر سعة 11 أونصة مجهز لطباعة تصاميمك المخصصة بألوان براقة.',
    type: 'blank',
    basePrice: 4.50,
    rating: 4.8,
    reviewsCount: 72,
    category: 'mugs',
    tags: ['blank', 'mug', 'ceramic', 'plain'],
    images: {
      primary: ceramicMugMockup,
    },
    colors: [
      { name: 'Pure White', hex: '#FFFFFF' },
      { name: 'Black Gloss', hex: '#0F172A' },
      { name: 'Matte Blue', hex: '#1E3A8A' }
    ],
    stock: 220,
    features: [
      '11oz high-density ceramic',
      'Dishwasher & microwave safe hard-coat',
      'Wrap-around 360 print compatibility'
    ],
    featuresAr: [
      'سيراميك عالي الكثافة سعة 11 أونصة',
      'طلاء صلب آمن للميكروويف وغسالة الأطباق',
      'متوافق مع الطباعة المحيطية الكاملة'
    ],
    printableAreas: [
      {
        location: 'front',
        name: 'Center Display',
        maxWidthCm: 9,
        maxHeightCm: 8.5,
        defaultWidthCm: 8,
        defaultHeightCm: 8,
        centerXPercent: 50,
        centerYPercent: 50,
        aspectRatio: 1.0
      }
    ],
    variants: [
      { id: 'v_bmug_wht', name: 'Pure White', color: '#FFFFFF', colorName: 'Pure White', sku: 'B-MUG-WHT-11', stock: 120 },
      { id: 'v_bmug_blk', name: 'Black Gloss', color: '#0F172A', colorName: 'Black Gloss', sku: 'B-MUG-BLK-11', stock: 100 }
    ]
  },
  {
    id: 'prod_cap_blank',
    name: 'Blank Snapback Cap',
    nameAr: 'كاب سناب باك سادة (خام)',
    description: 'Structured 6-panel flat-brim snapback blank hat with stiff buckram front for crisp print application.',
    descriptionAr: 'قبعة سناب باك سادة مقواة بـ 6 أجزاء مجهزة لطباعة الشعارات والتصاميم الحصرية.',
    type: 'blank',
    basePrice: 6.00,
    rating: 4.7,
    reviewsCount: 58,
    category: 'caps',
    tags: ['blank', 'cap', 'snapback', 'headwear'],
    images: {
      primary: snapbackCapMockup,
    },
    colors: [
      { name: 'Deep Black', hex: '#0B0F17' },
      { name: 'Charcoal', hex: '#334155' },
      { name: 'Royal Blue', hex: '#1D4ED8' }
    ],
    sizes: ['One Size (Adjustable Snap)'],
    stock: 160,
    features: [
      'Rigid front buckram for stable printing',
      'Adjustable snapback closure',
      'Durable twill weave structure'
    ],
    featuresAr: [
      'مقدمة مقواة تضمن ثبات واستقامة الطباعة',
      'حزام خلفي قابل للتعديل لكافة القياسات',
      'قماش تويل متين وعالي الجودة'
    ],
    printableAreas: [
      {
        location: 'front',
        name: 'Front Center',
        maxWidthCm: 12,
        maxHeightCm: 7,
        defaultWidthCm: 10,
        defaultHeightCm: 6,
        centerXPercent: 50,
        centerYPercent: 48,
        aspectRatio: 1.6
      }
    ],
    variants: [
      { id: 'v_bcap_blk', name: 'Deep Black / OS', color: '#0B0F17', colorName: 'Deep Black', size: 'One Size', sku: 'B-CAP-BLK-OS', stock: 90 },
      { id: 'v_bcap_chr', name: 'Charcoal / OS', color: '#334155', colorName: 'Charcoal', size: 'One Size', sku: 'B-CAP-CHR-OS', stock: 70 }
    ]
  }
];

export const INITIAL_DESIGNER_PROFILE: DesignerProfile = {
  id: 'designer_1',
  name: 'Astro Moh',
  email: 'astro.moh@dtfstudio.io',
  phone: '+962 79 888 1234',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
  bio: 'Specialized in sci-fi, cosmic illustrations, and cyberpunk vector art with transparent alpha channel preparation for DTF heat transfers.',
  bioAr: 'مصمم محترف متخصص في الرسوم الكونية والسايبربانك المجهزة خصيصاً لطباعة DTF عالية الدقة.',
  country: 'Jordan',
  status: 'approved',
  applicationDate: '2026-07-20T10:00:00Z',
  autoApprovedAt: '2026-07-20T10:00:05Z',
  commissionType: 'fixed',
  commissionRate: 0.50, // Default 0.50 JOD per unit
  sampleDesigns: [
    astronautArt,
    samuraiArt,
    lionArt,
  ],
  sampleInspections: [
    {
      id: 'insp_1',
      title: 'Astronaut Cosmic Master',
      titleAr: 'رائد الفضاء الكوني',
      readyToPrintFileName: 'astronaut_ready_print.png',
      previewUrl: astronautArt,
      readyToPrintUrl: astronautArt,
      dpi: 300,
      widthPx: 3600,
      heightPx: 4500,
      hasTransparency: true,
      targetWidthCm: 30.48,
      targetHeightCm: 38.10,
      passedQuality: true,
      score: 98,
      notes: 'Passed 300 DPI transparent alpha print check.',
      notesAr: 'اجتاز فحص الدقة 300 DPI والشفافية بنجاح.'
    },
    {
      id: 'insp_2',
      title: 'Samurai Bushido',
      titleAr: 'الساموراي الياباني',
      readyToPrintFileName: 'samurai_print.png',
      previewUrl: samuraiArt,
      readyToPrintUrl: samuraiArt,
      dpi: 300,
      widthPx: 3200,
      heightPx: 3900,
      hasTransparency: true,
      targetWidthCm: 27.0,
      targetHeightCm: 33.0,
      passedQuality: true,
      score: 97,
      notes: 'Passed 300 DPI vector DTF check.',
      notesAr: 'اجتاز فحص المتجهات بدقة 300 DPI.'
    },
    {
      id: 'insp_3',
      title: 'Lion Crown Vector',
      titleAr: 'ملك الغابة',
      readyToPrintFileName: 'lion_print.png',
      previewUrl: lionArt,
      readyToPrintUrl: lionArt,
      dpi: 300,
      widthPx: 4200,
      heightPx: 4800,
      hasTransparency: true,
      targetWidthCm: 35.0,
      targetHeightCm: 40.0,
      passedQuality: true,
      score: 100,
      notes: 'Passed maximum resolution and edge clarity inspection.',
      notesAr: 'اجتاز فحص الوضوح ونقاء الحواف بأعلى درجة.'
    }
  ],
  totalDesignsCount: 5,
  totalSoldOrUsed: 142,
  totalEarnings: 71.0, // 142 sales * 0.50 JOD
  withdrawableBalance: 41.0,
  pendingEarnings: 15.0,
  pendingWithdrawals: 0,
  completedWithdrawals: 30.0,
  balance: 41.0,
  totalEarned: 71.0,
  salesCount: 142,
  payoutDetails: {
    method: 'cliq',
    cliqAlias: 'ASTROMOH@ARABBANK',
    bankName: 'Arab Bank',
    iban: 'JO44ARAB0000000123456789012345',
    accountHolder: 'Mohammad Al-Zoubi'
  }
};

export const INITIAL_DESIGNERS: DesignerProfile[] = [
  INITIAL_DESIGNER_PROFILE,
  {
    id: 'designer_3',
    name: 'Rashed Ink',
    email: 'rashed.ink@dtfstudio.io',
    phone: '+962 79 333 4455',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    bio: 'Specialized in Japanese neo-traditional and calligraphy vector art prepared for direct digital apparel printing.',
    bioAr: 'فنان متخصص في الخط والرسوم اليابانية التراثية المجهزة للطباعة على الملابس.',
    country: 'Jordan',
    status: 'approved',
    applicationDate: '2026-07-28T14:30:00Z',
    autoApprovedAt: '2026-07-28T14:30:04Z',
    commissionType: 'fixed',
    commissionRate: 0.50, // Default 0.50 JOD per unit
    sampleDesigns: [samuraiArt, astronautArt, lionArt],
    totalDesignsCount: 3,
    totalSoldOrUsed: 65,
    totalEarnings: 32.50,
    withdrawableBalance: 32.50,
    pendingEarnings: 0,
    pendingWithdrawals: 0,
    completedWithdrawals: 0,
    payoutDetails: {
      method: 'cliq',
      cliqAlias: 'RASHEDINK@HOUSING',
      bankName: 'Housing Bank',
      iban: 'JO12HOUB0000000345678901234567',
      accountHolder: 'Rashed Al-Khatib'
    }
  },
  {
    id: 'designer_6',
    name: 'Kids Lab',
    email: 'kidslab.studio@dtfstudio.io',
    phone: '+962 78 777 9900',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
    bio: 'Cute streetwear characters, cartoons, and child-safe vibrant vector artwork.',
    bioAr: 'رسوم كرتونية وشخصيات أطفال حيوية ومبتكرة بجودة طباعة فائقة.',
    country: 'Jordan',
    status: 'approved',
    applicationDate: '2026-08-01T09:00:00Z',
    autoApprovedAt: '2026-08-01T09:00:03Z',
    commissionType: 'percentage',
    commissionRate: 10.0, // 10% commission
    sampleDesigns: [teddyDripArt, astronautArt, wolfNightArt],
    totalDesignsCount: 4,
    totalSoldOrUsed: 59,
    totalEarnings: 45.20,
    withdrawableBalance: 45.20,
    pendingEarnings: 0,
    pendingWithdrawals: 0,
    completedWithdrawals: 0,
    payoutDetails: {
      method: 'cliq',
      cliqAlias: 'KIDSLAB@ETIHAD',
      bankName: 'Bank al Etihad',
      iban: 'JO78ETIH0000000567890123456789',
      accountHolder: 'Lina Al-Husseini'
    }
  }
];

export const INITIAL_BUSINESS_SETTINGS: BusinessSettings = {
  currency: 'JOD',
  currencySymbol: 'JD',
  bankTransferReservationMinutes: 15,
  podConfirmationPeriodHours: 4,
  customerCancellationWindowMinutes: 60,
  minimumWithdrawalAmount: 10,
  defaultDesignerCommissionRate: 10,
  defaultDesignerFlatRoyalty: 0.50, // Default 0.50 JOD per unit
  standardDeliveryFee: 3.0,
  freeDeliveryThreshold: 45.0,
  storePickupEnabled: true,
  storePickupAddress: 'DTF Studio Headquarters, Mecca St, Building 44, Amman, Jordan',
  storePickupAddressAr: 'مقر DTF Studio الرئيسي، شارع مكة، مجمع 44، عمّان، الأردن',
  bankDetails: {
    bankName: 'Bank of Jordan / Arab Bank',
    accountName: 'DTF STUDIO PRINTING LLC',
    iban: 'JO92BOJO0001000012345678901234',
    cliqAlias: 'DTFSTUDIO',
    notes: 'Please quote your Order Number as the transfer reference and click "I Have Completed the Transfer".',
    notesAr: 'يرجى كتابة رقم الطلب في خانة الملاحظات/المرجع عند التحويل والنقر على "أتممت التحويل".'
  },
  artworkValidationRules: {
    maxFileSizeBytes: 50 * 1024 * 1024, // 50MB
    allowedFormats: ['png', 'svg', 'ai', 'psd', 'pdf'],
    minDpi: 300,
    requireTransparencyWarning: true
  },
  termsAndConditions: `1. CUSTOMER ORDERS & PRODUCTION: All orders are manufactured custom on-demand using state-of-the-art Direct-To-Film (DTF) technology. Once payment is confirmed, artwork is queued for precision digital printing.
2. UPLOADED ARTWORK & COPYRIGHT: Customers warrant that they own or hold lawful printing rights for any personal logos or artwork uploaded. DTF Studio holds no copyright over customer-supplied files.
3. THIRD-PARTY DESIGNER EARNINGS: Approved independent designers receive fixed or percentage-based royalties for every print generated using their protected gallery designs. Source PSD/AI files remain strictly confidential and are never distributed to customers.
4. ORDER CANCELLATION: Orders may be cancelled by the customer within the configured cancellation window before printing begins. Stock is automatically restored to inventory.
5. NO-RETURN POLICY: Because DTF items are custom printed per customer specifications (size, design, color, location), standard physical returns are not accepted unless there is a verifiable manufacturing defect reported within 48 hours of delivery.`,
  termsAndConditionsAr: `1. طلبات العملاء والإنتاج: تصنّع كافة الطلبات خصيصاً وحسب الطلب بتقنية Direct-To-Film (DTF). عند تأكيد الدفع يدخل التصميم خط الطباعة المباشرة.
2. حقوق التصاميم والملفات المرفوعة: يقر العميل بامتلاكه حقوق طباعة الشعارات أو التصاميم المرفوعة ولا يتحمل المتجر أي مسؤولية عن ملكية الملفات الشخصية.
3. أرباح المصممين المستقلين: يحصل المصمم المعتمد على نسبة أو مبلغ ثابت عن كل استخدام لتصميمه في المتجر، وتبقى ملفات المصدر الأصلية سرية ومحمية تماماً.
4. إلغاء الطلبات: يحق للعميل إلغاء الطلب خلال نافذة الإلغاء المحددة وقبل بدء عملية الطباعة.
5. سياسة عدم الاسترجاع: نظراً لأن المنتجات تطبع بشكل مخصص بالكامل (المقاس، التصميم، المكان بالسنتيمتر)، لا يسري عليها الإرجاع العادي إلا في حال وجود عيب تصنيعي مثبت خلال 48 ساعة من الاستلام.`,
  privacyPolicy: `We protect customer uploads and designer intellectual property with enterprise encryption. High-resolution production files are stored exclusively for fulfilling your specific order.`,
  privacyPolicyAr: `نحن نحمي خصوصية ملفات العملاء وحقوق المصممين الفكرية بأعلى معايير الأمان، وتستخدم الملفات حصرياً لتنفيذ طلباتك المحددة.`,
  noReturnPolicy: `DTF on-demand printed merchandise is custom tailored and non-refundable once production commences. Quality guarantees apply to print vibrancy and manufacturing defects.`,
  noReturnPolicyAr: `المنتجات المطبوعة حسب الطلب مخصصة بالكامل وغير قابلة للاسترجاع بعد بدء الإنتاج، مع ضمان استبدال فوري في حال وجود أي عيب طباعي أو تلف في الخامات.`
};

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'ord_1001',
    orderNumber: '#DTF-729104',
    customerId: 'cust_ahmad',
    customerInfo: {
      name: 'Ahmad Al-Khalil',
      phone: '+962 79 123 4567',
      email: 'ahmad@example.com',
      city: 'Amman',
      address: '7th Circle, Zahran St, Apt 3B',
      notes: 'Please ring bell upon delivery'
    },
    items: [
      {
        id: 'cart_item_1',
        productId: 'prod_tshirt',
        productName: 'Classic T-Shirt',
        productImage: tshirtBlackMockup,
        productType: 'ready_to_sell',
        selectedColor: 'Black',
        selectedColorHex: '#0B0F17',
        selectedSize: 'M',
        unitPrice: 12.99,
        quantity: 1,
        design: INITIAL_DESIGNS[0], // Astronaut
        productionSpec: {
          printLocation: 'front',
          widthCm: 10,
          heightCm: 10,
          positionX: 0,
          positionY: 0,
          rotationDeg: 0,
          isFlippedHorizontally: false,
          previewUrl: tshirtBlackMockup,
          productionFileUrl: INITIAL_DESIGNS[0].imageUrl,
          originalDpi: 300,
          notes: 'Standard chest placement, vibrant white underbase layer'
        },
        timestamp: Date.now() - 3600000
      }
    ],
    subtotal: 12.99,
    deliveryFee: 3.0,
    total: 15.99,
    totalAmount: 15.99,
    currency: 'JOD',
    paymentMethod: 'bank_transfer',
    paymentStatus: 'paid',
    deliveryType: 'delivery',
    status: 'under_preparation',
    statusHistory: [
      { status: 'new', timestamp: new Date(Date.now() - 7200000).toISOString(), note: 'Order created' },
      { status: 'payment_pending', timestamp: new Date(Date.now() - 7100000).toISOString(), note: 'Awaiting bank transfer confirmation' },
      { status: 'payment_confirmed', timestamp: new Date(Date.now() - 5400000).toISOString(), note: 'Payment verified via CliQ: REF#998234' },
      { status: 'under_preparation', timestamp: new Date(Date.now() - 1800000).toISOString(), note: 'DTF film printed & powdered, queueing heat-press' }
    ],
    createdAt: new Date(Date.now() - 7200000).toISOString()
  }
];

export const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif_1',
    targetRole: 'customer',
    title: 'Order Under Preparation',
    titleAr: 'طلبك قيد التجهيز والطباعة',
    message: 'Your custom Classic T-Shirt (#DTF-729104) is currently being printed on the DTF press.',
    messageAr: 'يتم الآن تجهيز وطباعة تيشيرتك المخصص (#DTF-729104) بأعلى دقة.',
    type: 'order',
    isRead: false,
    createdAt: new Date(Date.now() - 1800000).toISOString()
  },
  {
    id: 'notif_2',
    targetRole: 'designer',
    targetUserId: 'designer_1',
    title: 'Design Royalty Earned!',
    titleAr: 'مبروك! ربحت عمولة جديدة',
    message: 'Your design "Astronaut" was purchased on Classic T-Shirt. +1.50 JD credited.',
    messageAr: 'تم شراء تصميمك "Astronaut" على تيشيرت كلاسيك. أضيف 1.50 د.أ لرصيدك.',
    type: 'designer',
    isRead: false,
    createdAt: new Date(Date.now() - 5400000).toISOString()
  },
  {
    id: 'notif_3',
    targetRole: 'admin',
    title: 'New Bank Transfer Order',
    titleAr: 'طلب جديد بانتظار التحقق',
    message: 'Order #DTF-729104 by Ahmad Al-Khalil (15.99 JD) requires payment confirmation.',
    messageAr: 'طلب #DTF-729104 بقيمة 15.99 د.أ جاهز للمراجعة وتأكيد الدفعة.',
    type: 'payment',
    isRead: false,
    createdAt: new Date(Date.now() - 7200000).toISOString()
  }
];

export const INITIAL_CATEGORIES: CategoryItem[] = [
  {
    id: 'cat_tshirts',
    name: 'T-Shirts',
    nameAr: 'تيشيرتات',
    slug: 't_shirts',
    description: '100% Combed Cotton Ring-spun DTF Blank and Printed Apparel',
    image: tshirtBlackMockup,
    status: 'enabled',
    sortOrder: 1,
  },
  {
    id: 'cat_hoodies',
    name: 'Hoodies & Sweatshirts',
    nameAr: 'هوديز وسويت شيرتات',
    slug: 'hoodies',
    description: 'Heavyweight 380 GSM Fleece Winter Wear with DTF Print Transfer',
    image: hoodieBlackMockup,
    status: 'enabled',
    sortOrder: 2,
  },
  {
    id: 'cat_caps',
    name: 'Caps & Headwear',
    nameAr: 'قبعات وكابات',
    slug: 'caps',
    description: 'Structured 6-Panel Snapback and Trucker Hats',
    image: snapbackCapMockup,
    status: 'enabled',
    sortOrder: 3,
  },
  {
    id: 'cat_mugs',
    name: 'Drinkware & Mugs',
    nameAr: 'أكواب وماغات سيراميك',
    slug: 'mugs',
    description: '11oz & 15oz Ceramic Grade AAA Hard-Coat Sublimation & UV/DTF Mugs',
    image: ceramicMugMockup,
    status: 'enabled',
    sortOrder: 4,
  },
  {
    id: 'cat_bags',
    name: 'Canvas Tote Bags',
    nameAr: 'حقائب قماشية توت باج',
    slug: 'bags',
    description: 'Eco-Friendly Heavy Canvas Tote Bags for Daily Use & Brand Prints',
    status: 'enabled',
    sortOrder: 5,
  }
];

export const INITIAL_CUSTOMERS: CustomerRecord[] = [
  {
    id: 'cust_1',
    name: 'Ahmad Al-Khalil',
    email: 'ahmad.khalil@example.com',
    phone: '+962 7 9123 4567',
    city: 'Amman',
    address: 'Abdoun, Building 14, 2nd Floor',
    customerGroup: 'retail',
    ordersCount: 3,
    totalSpent: 87.50,
    dateAdded: '2026-06-14T09:20:00Z',
    status: 'active',
  },
  {
    id: 'cust_2',
    name: 'Tariq Mansoor',
    email: 'tariq.streetwear@agency.jo',
    phone: '+962 7 8899 1122',
    city: 'Amman',
    address: 'Rainbow Street, Art Studio 4B',
    customerGroup: 'wholesale',
    ordersCount: 12,
    totalSpent: 420.00,
    dateAdded: '2026-04-10T14:15:00Z',
    status: 'active',
  },
  {
    id: 'cust_3',
    name: 'Noor Haddad',
    email: 'noor.haddad@outlook.com',
    phone: '+962 7 7755 3311',
    city: 'Irbid',
    address: 'University St, Opp. Yarmouk Gate 2',
    customerGroup: 'vip',
    ordersCount: 6,
    totalSpent: 165.20,
    dateAdded: '2026-07-02T18:00:00Z',
    status: 'active',
  },
  {
    id: 'cust_4',
    name: 'Lina Qasim',
    email: 'lina.qasim@gmail.com',
    phone: '+962 7 9644 2200',
    city: 'Zarqa',
    address: 'New Zarqa, 36th Street',
    customerGroup: 'retail',
    ordersCount: 1,
    totalSpent: 24.50,
    dateAdded: '2026-08-15T11:45:00Z',
    status: 'active',
  }
];

export const INITIAL_COUPONS: CouponCode[] = [
  {
    id: 'cpn_welcome10',
    code: 'WELCOME10',
    type: 'percentage',
    discount: 10,
    minSpend: 20,
    maxUses: 500,
    usedCount: 84,
    expiryDate: '2026-12-31',
    status: 'enabled',
  },
  {
    id: 'cpn_dtfflash',
    code: 'DTFFLASH20',
    type: 'percentage',
    discount: 20,
    minSpend: 40,
    maxUses: 100,
    usedCount: 42,
    expiryDate: '2026-09-30',
    status: 'enabled',
  },
  {
    id: 'cpn_vip5jd',
    code: 'VIP5OFF',
    type: 'fixed',
    discount: 5,
    minSpend: 35,
    maxUses: 200,
    usedCount: 29,
    expiryDate: '2026-11-15',
    status: 'enabled',
  }
];

