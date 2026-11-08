/* HƯ GIỚI · VẠN KIẾP TÀNG THƯ · dữ liệu tự sự thuần.
   Xưng hô: NPC gọi người chơi là “đạo hữu” hoặc “ngươi”; Tàng Phong Lão Nhân
   dùng “đồ đệ”, người chơi xưng “ta” hay “đệ tử” theo quan hệ.
   Tên cổ là tên trong truyện, không thay tên vùng/điều kiện trong game. */
(function (root) {
  'use strict';
  const ACTS = [
  {
    "id": "ha",
    "title": "Tàn Ấn Nhân Gian",
    "world": "Hạ Giới",
    "chapters": [
      {
        "id": "ha-01",
        "title": "Khách Lạ Dưới Trời Tàn",
        "unlock": {
          "realm": 0
        },
        "zone": 0,
        "text": "Thanh Vân Sơn, cổ danh Vân Tẫn Sơn, quanh năm chìm trong những tầng mây xám. Khi dừng chân trước vách đá, đạo hữu nhận ra một nét khắc quen thuộc: chính hình dạng ấy từng phủ kín bầu trời Trái Đất, vào đêm trận văn cuốn người khỏi nhân gian. Trần Minh nói lối mòn này đã có trước cả những sơn môn đầu tiên, nhưng chẳng ai biết ai đã khắc chữ. Tiếng chuông chiều vọng qua khe núi, nhắc đạo hữu rằng đường về vẫn chưa tìm thấy. Dù vậy, lần đầu tiên kể từ ngày lạc giới, một dấu vết của cố hương đã xuất hiện giữa nơi xa lạ."
      },
      {
        "id": "ha-02",
        "title": "Trúc Hải Tàng Cơ",
        "unlock": {
          "realm": 1
        },
        "zone": 1,
        "text": "Trúc Ảnh Lâm có một khoảng rừng già, người địa phương gọi là Mặc Trúc U Lâm. Khi gió đi ngang những thân trúc rỗng, âm thanh nghe như tiếng ai đối đáp sau tấm rèm. Vũ Tiểu Thanh kể từng gặp một lữ khách không biết mình từ đâu đến, chỉ ôm chặt vật nhỏ mang theo từ quê nhà. Người ấy đã rời đi trước mùa mưa, không để lại tên họ. Đạo hữu nhìn những dấu chân bị rêu phủ, tự hỏi có bao nhiêu người cùng chịu cảnh tha hương. Không một lời đồn nào đủ thành chứng cứ, nhưng nỗi cô độc đã bớt nặng hơn một phần."
      },
      {
        "id": "ha-03",
        "title": "Một Kiếm Hỏi Chính Tà",
        "unlock": {
          "realm": 2
        },
        "zone": 2,
        "text": "Trên Vạn Kiếm Phong, cổ danh Thiên Nhẫn Kiếm Nhai, gió lướt qua vách dựng phát tiếng ngân như thép. Tô Nhược Vân tin kiếm rút ra phải biết bảo vệ ai; Diệp Hồng Y cho rằng giao đấu mới thử được lòng người. Họ tranh luận, rồi cùng im lặng trước vết nứt trên trận thạch hộ sơn. Đạo hữu nhớ lại đêm thiên biến: lúc ấy chẳng có ai đủ sức chặn những ký tự tràn xuống nhân gian. Mỗi đạo tu hành có thể chọn con đường khác nhau, nhưng khi tai kiếp đến, điều đáng hỏi không chỉ là ai thắng, mà còn là ai đứng lại giữ đường cho kẻ yếu."
      },
      {
        "id": "ha-04",
        "title": "Huyền Quy Phụ Cổ Văn",
        "unlock": {
          "realm": 3
        },
        "zone": 3,
        "text": "Từ Nguyên Anh Cốc, cổ danh Quy Văn U Cốc, đạo hữu tìm thấy bản dập được mang về từ Di tích Huyền Quy. Tạ Thiên Cơ đã đối chiếu từng nét suốt nhiều năm, riêng ký tự ở giữa vẫn khuyết một phần. Khi đạo hữu phác lại trận văn từng xuất hiện trên trời Trái Đất, khoảng khuyết bất ngờ trùng khớp. Tạ Thiên Cơ không vội kết luận, bởi một nét đúng chưa thể giải nghĩa cả trận pháp. Nhưng đạo hữu đã có lý do để tin tai biến năm ấy không hoàn toàn không dấu vết. Những người để lại bia đá có thể biết điều mà cả Hư Giới hôm nay đã quên."
      },
      {
        "id": "ha-05",
        "title": "Vạn Thệ Vấn Đạo Tâm",
        "unlock": {
          "realm": 4
        },
        "zone": 4,
        "text": "Hóa Thần Đài từng được gọi là Vạn Thệ Đài, nơi người vượt một bước lớn thường để lại lời hứa trước trời đất. Đạo hữu đã đi qua những người hộ trận ở Thanh Vân Tông, kiếm khách của Huyết Sát Môn và dược sư từ Vạn Dược Cốc. Họ không chung đường, nhưng ai cũng có điều muốn giữ. Trên bậc đá cao nhất, nỗi nhớ Trái Đất vẫn nguyên vẹn, còn Hư Giới đã không hoàn toàn xa lạ. Đạo hữu không thề quên cố hương, cũng không vội nhận nơi này làm nhà; chỉ tự nhắc rằng hành trình tìm lối về không được xem nhẹ những người đang sống bên mình.",
        "choices": [
          {
            "id": "tim-ve",
            "label": "Ta vẫn muốn tìm đường về cố hương.",
            "reply": "Lời hẹn hướng về quê nhà được lưu lại, không phủ nhận tình nghĩa ở Hư Giới."
          },
          {
            "id": "giu-loi",
            "label": "Ta muốn giữ lời với người ở lại.",
            "reply": "Lời hẹn với người ở lại được lưu lại, không xóa ký ức về quê nhà."
          }
        ]
      }
    ]
  },
  {
    "id": "linh",
    "title": "Thiên Khuyết Cựu Ước",
    "world": "Linh Giới",
    "chapters": [
      {
        "id": "linh-01",
        "title": "Hư Uyên Vô Hồi",
        "unlock": {
          "realm": 5
        },
        "zone": 5,
        "text": "Hư Không Cảnh, trong cổ lục còn gọi là Liệt Giới Uyên, mở ra như vực sâu không đáy. Phù thạch trôi qua mang chữ viết của những thời đại không ai còn nhớ. Có mảnh nhắc đến bầu trời chưa từng có trên địa đồ Hư Giới; có mảnh chỉ lưu lời người lữ khách nói mình vẫn tìm đường về nhà. Đạo hữu lần theo những dấu văn ấy và nhận ra trận pháp cổ có lẽ từng nối các cõi cách xa nhau vô tận. Nhưng không một phiến đá nào ghi rằng người viết đã trở về. Sự im lặng ấy đáng sợ hơn một lời cảnh báo, bởi con đường mở ra chưa chắc có lối quay đầu."
      },
      {
        "id": "linh-02",
        "title": "Song Mệnh Đồng Quy",
        "unlock": {
          "realm": 6
        },
        "zone": 6,
        "text": "Hợp Thể Sơn, cổ danh Song Mệnh Lĩnh, có hai dòng suối chảy cạnh nhau mà không hòa cho tới cuối núi. Một người giữ đồi kể chuyện tu sĩ sau nhiều kiếp đã quên giọng mẹ, nhưng vẫn thuộc giai điệu người từng hát. Đạo hữu chợt nghĩ ngày trở về Trái Đất, mình có thể đã thành người quá khác. Cảnh giới cao giúp nhìn xa hơn, không giữ hộ từng kỷ niệm bé nhỏ. Đêm đó, đạo hữu ghi lại vài điều của nhân gian vào Thiên Thư: một buổi chiều, một tên phố, một giọng nói. Không phải để níu thời gian, mà để nhớ vì sao bản thân bắt đầu đi tìm lối cũ."
      },
      {
        "id": "linh-03",
        "title": "Thiên Thư Vô Chủ",
        "unlock": {
          "realm": 7
        },
        "zone": 7,
        "text": "Giữa Đại Thừa Thiên có một đài quan tinh cũ, cổ danh Thái Văn Thiên. Mảnh ký lục từ Thái Cổ Tiên Phủ nói về những tu sĩ từng cùng nghiên cứu trận văn trước thời thiên đạo tái lập. Người viết không kể danh hiệu tiên nhân, chỉ ghi tên những người đã đứng giữ cửa trận khi các cõi va vào nhau. Có người muốn khép toàn bộ lối xuyên giới để ngăn tai họa; có người xin chừa đường cho kẻ bị cuốn khỏi quê nhà. Cuộc tranh luận không có câu kết. Đạo hữu hiểu rằng trật tự của ngày hôm nay có thể bắt nguồn từ một lời hẹn còn dang dở của người xưa.",
        "choices": [
          {
            "id": "mo-loi",
            "label": "Giữ một đường về cho người lạc giới.",
            "reply": "Trang sách ghi nhận mong ước mở lối, không phán ai đúng sai."
          },
          {
            "id": "ho-gioi",
            "label": "Tìm cách giữ an toàn cho các giới.",
            "reply": "Trang sách ghi nhận ý nguyện hộ giới, không phán ai đúng sai."
          }
        ]
      },
      {
        "id": "linh-04",
        "title": "Cửu Tiêu Vấn Kiếp",
        "unlock": {
          "realm": 8
        },
        "zone": 8,
        "text": "Trên Cửu Cửu Kiếp Đài, cổ danh Cửu Tiêu Lôi Quan, tầng mây kiếp cuộn thành những lớp cửa thành. Từ xa, Thiên Môn Kiếp Hải vọng tiếng sấm không dứt. Giữa một phiến đá nứt, đạo hữu đọc được câu chữ cổ: thiên kiếp thử đạo tâm, không thay sinh linh chọn đường. Không ai biết người khắc lời ấy đã vượt qua được biển kiếp hay chưa. Đứng trước trời cao, đạo hữu không cầu một lời phán rằng mình phải trở về hay ở lại. Nếu thiên đạo đang được dựng lại, điều quan trọng hơn cả là người đi trên tiên lộ có dám nhận lấy hậu quả từ lựa chọn của mình."
      }
    ]
  },
  {
    "id": "tien",
    "title": "Hồng Mông Vấn Đạo",
    "world": "Tiên Giới",
    "chapters": [
      {
        "id": "tien-01",
        "title": "Tiên Khuyết Vô Danh",
        "unlock": {
          "realm": 9
        },
        "zone": 9,
        "text": "Chân Tiên Điện, cổ danh Khuyết Tượng Tiên Điện, không dựng tượng của một vị chủ nhân nào. Trên tường là những ô trống khắc tên người từng góp sức sửa những lối qua hư không. Họ khác quê quán, khác tiếng nói, có người thậm chí không cùng một bầu trời sinh trưởng. Đạo hữu tìm mãi mà chẳng thấy tên người đứng đầu để trách hay cảm tạ. Có lẽ thiên đạo tái lập không bắt đầu từ một mệnh lệnh duy nhất, mà từ vô số bàn tay giữ cho thế giới khỏi đổ vỡ. Trước những tấm bia lặng im, đạo hữu cúi đầu với những người đã đi trước, không hỏi họ thuộc chính đạo hay tà đạo."
      },
      {
        "id": "tien-02",
        "title": "Vạn Hải Tầm Cố Hương",
        "unlock": {
          "realm": 10
        },
        "zone": 10,
        "text": "Kim Tiên Hải có một vùng nước tĩnh, cổ danh Hoài Ức Hải. Kẻ soi xuống thường không thấy dung nhan, mà thấy một cảnh nhỏ tưởng đã quên: tiếng mưa bên cửa kính, con đường về nhà, chiếc bàn còn dở bữa cơm. Đạo hữu đứng rất lâu mà không đưa tay khuấy nước. Nỗi nhớ Trái Đất không còn là cơn đau dữ dội của kẻ mới lạc giới, nhưng vẫn bền bỉ như một lời nhắc. Muốn trở về là điều chính đáng; muốn bảo vệ những người từng giúp mình trên tiên lộ cũng vậy. Mặt biển không chọn thay ai, chỉ giữ cả hai điều trong cùng một khoảng lặng."
      },
      {
        "id": "tien-03",
        "title": "Cổ Khế Phong Thiên",
        "unlock": {
          "realm": 11
        },
        "zone": 11,
        "text": "Ở Thái Ất Cung, cổ danh Thệ Thiên Cổ Cung, đạo hữu đọc được hai bản của một giao ước. Bản đầu khuyên đóng mọi nẻo xuyên giới, tránh tai họa lan sang nơi khác. Bản sau xin để lại lối về cho những người bị trận văn cuốn khỏi cố hương. Cả hai đều mang dấu sửa dở, không bản nào ghi lời chấp thuận cuối. Đạo hữu hiểu trật tự không thể được giữ bằng cách bỏ mặc kẻ lạc đường, nhưng mở hết cửa cũng có thể mang nguy hiểm đến những người chưa chuẩn bị. Thiên đạo tái lập chưa chắc là câu trả lời trọn vẹn; có khi chỉ là cơ hội để muôn sinh linh cùng tìm đáp án."
      },
      {
        "id": "tien-04",
        "title": "Đại Đạo Quy Nhất",
        "unlock": {
          "realm": 12
        },
        "zone": 12,
        "text": "Đại La Thiên, cổ danh Vạn Ảnh Thiên, không có gương mà lại hiện ra muôn dáng người. Đạo hữu thấy mình khi vừa rơi vào Hư Giới, thấy những lần lạc đường và những lời hứa từng giữ. Mỗi bóng hình đều muốn kể rằng con đường của mình mới đúng. Nhưng một đời tu hành không thể thu lại thành một lần thắng bại, cũng không thể xóa hết nợ ân tình nhờ cảnh giới cao. Đạo hữu nhìn những hình bóng tan dần rồi giữ lại một điều: thành tiên không phải quên mình từng là người. Con đường vô tận chỉ có ý nghĩa khi chính kẻ bước đi biết vì sao phải đi tiếp."
      },
      {
        "id": "tien-05",
        "title": "Một Nét Định Hồng Mông",
        "unlock": {
          "realm": 13
        },
        "zone": 13,
        "text": "Hồng Mông Đạo Vực, cổ danh Sơ Nguyên Đạo Vực, mở ra không bờ bến mà chẳng vang lời tuyên cáo của đấng tối cao. Trong khoảng trống chỉ còn một nét trận văn chưa viết trọn, giống dấu khuyết Tạ Thiên Cơ từng tìm trên bản dập Huyền Quy. Đạo hữu biết mình không thể thay muôn sinh linh định đoạt tương lai, càng không thể cưỡng ép trời đất mở cửa về cố thổ. Nét bút cuối vì thế không phải mệnh lệnh, mà là lời hẹn: để kẻ đến sau vẫn có quyền tìm kiếm và lựa chọn. Vạn kiếp còn dài, song từ đây đạo hữu đã có câu trả lời cho chính mình.",
        "choices": [
          {
            "id": "mo-duong",
            "label": "Để lại một lối cho người đi sau.",
            "reply": "Lời hẹn được lưu lại, không ép thiên địa phải nghe theo."
          },
          {
            "id": "giu-ky-uc",
            "label": "Giữ ký ức người lạc giới.",
            "reply": "Lời hẹn được lưu lại, không ép thiên địa phải nghe theo."
          }
        ]
      }
    ]
  }
];
  const NPCS = {
  "NPC001": {
    "stranger": {
      "id": "npc-NPC001-xa-la",
      "title": "Đường về Trấn Lạc Phong",
      "lines": [
        {
          "who": "npc",
          "text": "Đạo hữu lạ mặt? Ta quen đường quanh Trấn Lạc Phong, nhưng chưa từng thấy ngươi."
        },
        {
          "who": "player",
          "text": "Ta đang tìm dấu văn khắc trên đá."
        },
        {
          "who": "npc",
          "text": "Lối mòn sau núi có vài tấm bia cũ. Chớ đi lúc trời tối."
        },
        {
          "who": "player",
          "text": "Đa tạ, ta sẽ ghi nhớ."
        },
        {
          "who": "npc",
          "text": "Không cần tạ. Chỉ đừng nói với ai rằng ta đã chỉ đường bừa."
        }
      ]
    },
    "familiar": {
      "id": "npc-NPC001-quen-biet",
      "title": "Dấu chân trong mưa",
      "lines": [
        {
          "who": "npc",
          "text": "Ngươi lại đến. Ta vừa dọn lối đi qua chỗ đá lở hôm trước."
        },
        {
          "who": "player",
          "text": "Ngươi vẫn nhớ chuyện tấm bia sao?"
        },
        {
          "who": "npc",
          "text": "Ta nhớ lời mình nói. Người đi đường cũng phải giữ chữ tín như người bán hàng."
        },
        {
          "who": "player",
          "text": "Ta không muốn ai gặp hiểm nguy vì mình."
        },
        {
          "who": "npc",
          "text": "Vậy hãy nhìn kỹ dấu chân, đừng để mưa xóa mất đường về."
        }
      ]
    },
    "confidant": {
      "id": "npc-NPC001-tri-ky",
      "title": "Người dẫn lối",
      "lines": [
        {
          "who": "npc",
          "text": "Ta từng nghĩ biết mọi đường quanh trấn là đủ cho một đời."
        },
        {
          "who": "player",
          "text": "Còn có những con đường không nằm trên bản đồ."
        },
        {
          "who": "npc",
          "text": "Đúng vậy. Ngươi đã khiến ta hiểu nỗi lòng của kẻ không biết nhà ở đâu."
        },
        {
          "who": "player",
          "text": "Ta vẫn chưa tìm được lối về."
        },
        {
          "who": "npc",
          "text": "Nếu tìm được, ngươi hãy để một dấu cho người đến sau."
        }
      ],
      "choices": [
        {
          "id": "de-dau",
          "label": "Ta sẽ để lại dấu cho người đi sau.",
          "reply": "Người dẫn lối nghe vậy liền gật đầu thật chậm."
        },
        {
          "id": "tim-ve",
          "label": "Ta chỉ biết mình phải tìm lối về.",
          "reply": "Trần Minh đáp rằng không ai nên hứa điều mình chưa chắc làm được."
        }
      ]
    }
  },
  "NPC002": {
    "stranger": {
      "id": "npc-NPC002-xa-la",
      "title": "Kiếm và trận",
      "lines": [
        {
          "who": "npc",
          "text": "Ta là Tô Nhược Vân của Thanh Vân Tông. Đồng môn đến đây học kiếm hay hộ trận?"
        },
        {
          "who": "player",
          "text": "Ta muốn hiểu trận văn cổ."
        },
        {
          "who": "npc",
          "text": "Trận hỏng thì kẻ yếu chịu tai họa trước. Đừng chỉ nghĩ đến kiếm pháp."
        },
        {
          "who": "player",
          "text": "Ta sẽ nhớ điều đó."
        },
        {
          "who": "npc",
          "text": "Tốt. Một thanh kiếm thẳng phải biết vì ai mà rút khỏi vỏ."
        }
      ]
    },
    "familiar": {
      "id": "npc-NPC002-quen-biet",
      "title": "Giữ kiếm",
      "lines": [
        {
          "who": "npc",
          "text": "Kiếm thế ngươi đã ổn định. Nhưng ta thấy ngươi vẫn hay phân tâm."
        },
        {
          "who": "player",
          "text": "Ta còn nhớ quê nhà."
        },
        {
          "who": "npc",
          "text": "Nhớ không có lỗi. Người giữ trận cũng có chốn muốn trở về."
        },
        {
          "who": "player",
          "text": "Ngươi có bao giờ muốn rời sơn môn?"
        },
        {
          "who": "npc",
          "text": "Có. Rồi ta chọn quay lại, vì lời hứa của chính mình."
        }
      ]
    },
    "confidant": {
      "id": "npc-NPC002-tri-ky",
      "title": "Lời trước sơn môn",
      "lines": [
        {
          "who": "npc",
          "text": "Ta không hỏi nữa về nguồn gốc của ngươi. Ngươi sẽ kể khi sẵn sàng."
        },
        {
          "who": "player",
          "text": "Ta biết ngươi tin ta."
        },
        {
          "who": "npc",
          "text": "Tin tưởng không có nghĩa là giữ ngươi ở đây mãi."
        },
        {
          "who": "player",
          "text": "Ta phải tiếp tục tìm đường."
        },
        {
          "who": "npc",
          "text": "Hãy đi. Nếu cần một người cùng giữ cửa trận, cứ gọi tên ta."
        }
      ],
      "choices": [
        {
          "id": "ho-tran",
          "label": "Ta sẽ giúp giữ cửa trận khi cần.",
          "reply": "Tô Nhược Vân đáp: Ta ghi nhận lời đạo hữu."
        },
        {
          "id": "len-duong",
          "label": "Ta còn phải lên đường tìm cố hương.",
          "reply": "Tô Nhược Vân đáp: Một thanh kiếm thẳng không khóa chân chủ nhân."
        }
      ]
    }
  },
  "NPC003": {
    "stranger": {
      "id": "npc-NPC003-xa-la",
      "title": "Hẹn tỉ thí",
      "lines": [
        {
          "who": "npc",
          "text": "Ta là Diệp Hồng Y của Huyết Sát Môn. Có dám cùng ta so vài đường kiếm?"
        },
        {
          "who": "player",
          "text": "Ta muốn biết đối thủ trước đã."
        },
        {
          "who": "npc",
          "text": "Ha! Ta thích người cẩn trọng, miễn đừng nhận lời rồi bỏ trốn."
        },
        {
          "who": "player",
          "text": "Ta sẽ không thất hứa."
        },
        {
          "who": "npc",
          "text": "Tốt. Ta lấy chiến dưỡng đạo, nhưng không đánh kẻ không muốn giao đấu."
        }
      ]
    },
    "familiar": {
      "id": "npc-NPC003-quen-biet",
      "title": "Sau một trận đấu",
      "lines": [
        {
          "who": "npc",
          "text": "Ngươi mạnh hơn lần trước rồi. Một trận chưa đủ phân hơn thua."
        },
        {
          "who": "player",
          "text": "Ta cũng muốn biết giới hạn của mình."
        },
        {
          "who": "npc",
          "text": "Vậy đừng dùng lời hoa mỹ. Cứ đem bản lĩnh ra nói chuyện."
        },
        {
          "who": "player",
          "text": "Ngươi chưa từng sợ thất bại sao?"
        },
        {
          "who": "npc",
          "text": "Có chứ. Nhưng ta sợ nhất những lời hẹn bị nuốt trôi."
        }
      ]
    },
    "confidant": {
      "id": "npc-NPC003-tri-ky",
      "title": "Đối thủ tri kỷ",
      "lines": [
        {
          "who": "npc",
          "text": "Nghe nói ngươi tìm một con đường rời Hư Giới."
        },
        {
          "who": "player",
          "text": "Ta vẫn muốn trở về cố hương."
        },
        {
          "who": "npc",
          "text": "Tốt. Đối thủ của ta phải có việc lớn hơn thắng một trận."
        },
        {
          "who": "player",
          "text": "Nếu ngày nào gặp lại, ta sẽ kể chuyện đường xa."
        },
        {
          "who": "npc",
          "text": "Nhớ giữ lời. Ta muốn biết ngoài trời đất này còn có ai dám luận kiếm."
        }
      ],
      "choices": [
        {
          "id": "ke-chuyen",
          "label": "Ta sẽ kể về những trời đất khác.",
          "reply": "Diệp Hồng Y cười: Ta chờ lời hẹn ấy."
        },
        {
          "id": "ti-thi",
          "label": "Ngày trở lại, hãy tỉ thí trước.",
          "reply": "Diệp Hồng Y bật cười: Đúng là đối thủ của ta."
        }
      ]
    }
  },
  "NPC004": {
    "stranger": {
      "id": "npc-NPC004-xa-la",
      "title": "Trong vườn dược",
      "lines": [
        {
          "who": "npc",
          "text": "Ta là Bạch Tử Yên, dược sư Vạn Dược Cốc. Đạo hữu cần luyện đan chăng?"
        },
        {
          "who": "player",
          "text": "Ta muốn học nhận biết linh thảo."
        },
        {
          "who": "npc",
          "text": "Một vị sai có thể khiến cả lò đan hỏng. Đừng đoán bừa tên cây."
        },
        {
          "who": "player",
          "text": "Ta sẽ nói điều mình biết, không bịa."
        },
        {
          "who": "npc",
          "text": "Thế mới có thể cùng ta thử lò được."
        }
      ]
    },
    "familiar": {
      "id": "npc-NPC004-quen-biet",
      "title": "Đan hương",
      "lines": [
        {
          "who": "npc",
          "text": "Mẻ đan hôm nay thành, nhưng ta vẫn thấy một chỗ cần sửa."
        },
        {
          "who": "player",
          "text": "Ngươi khắt khe với mình thật."
        },
        {
          "who": "npc",
          "text": "Kẻ học thuốc phải cẩn trọng hơn người khác, vì có người đặt sinh mạng vào tay mình."
        },
        {
          "who": "player",
          "text": "Ta hiểu điều đó."
        },
        {
          "who": "npc",
          "text": "Vậy xin hãy nhớ: cứu người không phải lời nói đẹp, mà là việc làm mỗi ngày."
        }
      ]
    },
    "confidant": {
      "id": "npc-NPC004-tri-ky",
      "title": "Mùa cây ở quê",
      "lines": [
        {
          "who": "npc",
          "text": "Ta nghe ngươi từng sống dưới một bầu trời khác."
        },
        {
          "who": "player",
          "text": "Đúng. Ở đó cũng có mùa mưa và cây thuốc."
        },
        {
          "who": "npc",
          "text": "Một ngày nào đó, kể ta nghe về những loài cây ấy nhé."
        },
        {
          "who": "player",
          "text": "Ta sẽ kể, khi gặp lại."
        },
        {
          "who": "npc",
          "text": "Ta chờ. Không phải vì đơn thuốc, chỉ vì muốn biết ngươi đã sống thế nào."
        }
      ],
      "choices": [
        {
          "id": "ke-que",
          "label": "Ta sẽ kể về cây cỏ quê nhà.",
          "reply": "Bạch Tử Yên đáp rằng nàng mong được nghe."
        },
        {
          "id": "giu-rieng",
          "label": "Có những điều ta chưa muốn nhắc.",
          "reply": "Bạch Tử Yên đáp rằng giữ riêng ký ức cũng là quyền của ngươi."
        }
      ]
    }
  },
  "NPC005": {
    "stranger": {
      "id": "npc-NPC005-xa-la",
      "title": "Mảnh bia Huyền Quy",
      "lines": [
        {
          "who": "npc",
          "text": "Đừng chạm lên bản dập. Ta là Tạ Thiên Cơ, người nghiên cứu Di tích Huyền Quy."
        },
        {
          "who": "player",
          "text": "Ta từng thấy những ký tự giống như thế."
        },
        {
          "who": "npc",
          "text": "Vậy hãy vẽ lại. Phá bia lấy chữ là việc người thiếu kiên nhẫn mới làm."
        },
        {
          "who": "player",
          "text": "Ta sẽ giữ nguyên di tích."
        },
        {
          "who": "npc",
          "text": "Được. Ta không ghét người hỏi nhiều, chỉ ghét kẻ phá vật chứng."
        }
      ]
    },
    "familiar": {
      "id": "npc-NPC005-quen-biet",
      "title": "Dấu văn khuyết",
      "lines": [
        {
          "who": "npc",
          "text": "Nét ngươi vẽ vừa khít khoảng trống trong bản dập. Điều ấy đáng để suy xét."
        },
        {
          "who": "player",
          "text": "Có phải trận văn đưa người vượt giới?"
        },
        {
          "who": "npc",
          "text": "Chưa thể kết luận. Một nét đúng không đủ giải nghĩa muôn chữ."
        },
        {
          "who": "player",
          "text": "Ta sẽ tìm thêm dấu tích."
        },
        {
          "who": "npc",
          "text": "Ta cũng vậy. Cẩn trọng không phải chậm chạp, mà là không nói quá điều biết."
        }
      ]
    },
    "confidant": {
      "id": "npc-NPC005-tri-ky",
      "title": "Bí mật chưa chứng",
      "lines": [
        {
          "who": "npc",
          "text": "Ta nghĩ trận văn xưa có thể giữ cửa, cũng có thể mở đường."
        },
        {
          "who": "player",
          "text": "Ta không muốn nó giam giữ người lạc giới."
        },
        {
          "who": "npc",
          "text": "Ta cũng vậy, nhưng mong muốn không phải bằng chứng."
        },
        {
          "who": "player",
          "text": "Ta sẽ kể lại đêm thiên biến khi đủ tin tưởng."
        },
        {
          "who": "npc",
          "text": "Ta ghi lời ngươi đúng như nó có, không tô vẽ để vừa giả thuyết."
        }
      ],
      "choices": [
        {
          "id": "noi-that",
          "label": "Ta sẽ kể lại những điều từng thấy.",
          "reply": "Tạ Thiên Cơ hứa ghi rõ lời chứng và điều chưa kiểm chứng."
        },
        {
          "id": "can-than",
          "label": "Ta muốn tìm thêm bằng chứng trước.",
          "reply": "Tạ Thiên Cơ gật đầu: Ta cũng chọn như vậy."
        }
      ]
    }
  },
  "NPC010": {
    "stranger": {
      "id": "npc-NPC010-xa-la",
      "title": "Lối vào Hắc Lâm",
      "lines": [
        {
          "who": "npc",
          "text": "Đạo hữu đây rồi! Ta là Vũ Tiểu Thanh, quen hết những lối chính trong Hắc Lâm."
        },
        {
          "who": "player",
          "text": "Ta nghe rừng này dễ lạc."
        },
        {
          "who": "npc",
          "text": "Đúng, nên ta luôn đánh dấu cây trước khi rẽ."
        },
        {
          "who": "player",
          "text": "Ta có thể đi cùng ngươi không?"
        },
        {
          "who": "npc",
          "text": "Đi chứ. Đã nhận dẫn đường, ta sẽ không bỏ bạn giữa rừng."
        }
      ]
    },
    "familiar": {
      "id": "npc-NPC010-quen-biet",
      "title": "Dấu cây cũ",
      "lines": [
        {
          "who": "npc",
          "text": "Ngươi còn nhớ cây có vết khắc hình lá không? Lối ấy vẫn đi được."
        },
        {
          "who": "player",
          "text": "Ta nhớ. Ngươi giữ lời thật."
        },
        {
          "who": "npc",
          "text": "Lời hẹn mà không giữ thì còn gọi gì là bạn."
        },
        {
          "who": "player",
          "text": "Có ngày ta phải đi rất xa."
        },
        {
          "who": "npc",
          "text": "Thì báo ta trước. Ta không thích đợi người đã quên hẹn."
        }
      ]
    },
    "confidant": {
      "id": "npc-NPC010-tri-ky",
      "title": "Ngày xa đường",
      "lines": [
        {
          "who": "npc",
          "text": "Ta đánh dấu thêm một gốc cây già để ngươi nhận ra lối trở lại."
        },
        {
          "who": "player",
          "text": "Ta chưa biết mình có quay lại hay không."
        },
        {
          "who": "npc",
          "text": "Không sao. Có đường về thì tốt, không có ta vẫn chúc ngươi bình an."
        },
        {
          "who": "player",
          "text": "Ngươi là người bạn tốt."
        },
        {
          "who": "npc",
          "text": "Vậy đừng quên gọi tên ta nếu một ngày chân ngươi lại chạm đất Hắc Lâm."
        }
      ],
      "choices": [
        {
          "id": "hen-gap",
          "label": "Nếu còn trở lại, ta sẽ tìm ngươi.",
          "reply": "Vũ Tiểu Thanh hứa giữ lối mòn sạch cỏ."
        },
        {
          "id": "chua-biet",
          "label": "Ta chưa biết mình có trở về.",
          "reply": "Vũ Tiểu Thanh đáp rằng nàng chỉ mong ngươi bình an."
        }
      ]
    }
  },
  "NPC011": {
    "stranger": {
      "id": "npc-NPC011-xa-la",
      "title": "Mỏ Linh Thiết",
      "lines": [
        {
          "who": "npc",
          "text": "Ta là Lâm Thiết Sinh, thợ ở Mỏ Linh Thiết. Cẩn thận than nóng."
        },
        {
          "who": "player",
          "text": "Ta muốn xem vật liệu ngươi bán."
        },
        {
          "who": "npc",
          "text": "Cứ nhìn kỹ. Sắt rỗng ruột ta nói rỗng, không lấy lời hay che vết nứt."
        },
        {
          "who": "player",
          "text": "Ta thích người nói thật."
        },
        {
          "who": "npc",
          "text": "Làm nghề này, một lời gian dối đủ hỏng cả thanh danh."
        }
      ]
    },
    "familiar": {
      "id": "npc-NPC011-quen-biet",
      "title": "Dấu búa",
      "lines": [
        {
          "who": "npc",
          "text": "Chiếc búa cũ của ta lại dùng được, sau một đêm sửa cán."
        },
        {
          "who": "player",
          "text": "Sao ngươi không đổi búa mới?"
        },
        {
          "who": "npc",
          "text": "Đồ có thể sửa thì nên giữ. Người cũng thế, đừng bỏ hết kỷ niệm sau một lần vấp."
        },
        {
          "who": "player",
          "text": "Ngươi nói có lý."
        },
        {
          "who": "npc",
          "text": "Ta chỉ làm nghề rèn, chuyện đạo lớn xin đừng bắt ta khoe khoang."
        }
      ]
    },
    "confidant": {
      "id": "npc-NPC011-tri-ky",
      "title": "Thép đi đường xa",
      "lines": [
        {
          "who": "npc",
          "text": "Mai ngươi lại lên đường sao?"
        },
        {
          "who": "player",
          "text": "Ta còn có điều phải tìm."
        },
        {
          "who": "npc",
          "text": "Sắt từ mỏ này từng đến những nơi ta chưa đặt chân. Nghĩ vậy cũng vui."
        },
        {
          "who": "player",
          "text": "Ta sẽ giữ lấy món đồ ngươi làm."
        },
        {
          "who": "npc",
          "text": "Giữ gìn thân mình trước. Đồ vật hỏng sửa được, lời hứa mất mới khó rèn lại."
        }
      ],
      "choices": [
        {
          "id": "giu-ky-vat",
          "label": "Ta sẽ giữ món đồ làm kỷ niệm.",
          "reply": "Lâm Thiết Sinh bảo hãy dùng nó đúng cách."
        },
        {
          "id": "giu-loi",
          "label": "Ta sẽ giữ lời với người còn đợi.",
          "reply": "Lâm Thiết Sinh đáp: Lời thẳng đáng giá hơn sắt tốt."
        }
      ]
    }
  },
  "NPC012": {
    "stranger": {
      "id": "npc-NPC012-xa-la",
      "title": "Phường thị Lạc Phong",
      "lines": [
        {
          "who": "npc",
          "text": "Khách quan ghé xem hàng! Ta là Tống Hữu Tài của Lạc Phong Phường Thị."
        },
        {
          "who": "player",
          "text": "Ngươi có chắc nguồn hàng không?"
        },
        {
          "who": "npc",
          "text": "Đạo hữu cứ hỏi. Ta bán lời thật, không cần bày thứ không rõ gốc."
        },
        {
          "who": "player",
          "text": "Ta coi trọng chữ tín."
        },
        {
          "who": "npc",
          "text": "Vậy chúng ta dễ làm ăn. Nhưng không mua cũng chẳng sao."
        }
      ]
    },
    "familiar": {
      "id": "npc-NPC012-quen-biet",
      "title": "Đường thương đội",
      "lines": [
        {
          "who": "npc",
          "text": "Thương đội phía tây vừa trở lại. Họ đi chậm hơn, nhưng không ai bị bỏ lại."
        },
        {
          "who": "player",
          "text": "Đi đường dài hẳn chẳng dễ."
        },
        {
          "who": "npc",
          "text": "Lãi mỏng mà giữ được người còn hơn lời nhiều rồi mất cả đoàn."
        },
        {
          "who": "player",
          "text": "Ngươi nghĩ xa hơn một vụ mua bán."
        },
        {
          "who": "npc",
          "text": "Người giữ cửa hiệu phải nghĩ đến ngày mai, đạo hữu ạ."
        }
      ]
    },
    "confidant": {
      "id": "npc-NPC012-tri-ky",
      "title": "Sổ nợ chưa xóa",
      "lines": [
        {
          "who": "npc",
          "text": "Trong sổ ta có một món tiền khách cũ chưa tới nhận. Ta vẫn giữ."
        },
        {
          "who": "player",
          "text": "Đã lâu thế sao?"
        },
        {
          "who": "npc",
          "text": "Đã hứa trả thì người ấy chưa đến cũng không được coi như món lời."
        },
        {
          "who": "player",
          "text": "Nếu ta trở về quê nhà, ta sẽ kể chuyện này."
        },
        {
          "who": "npc",
          "text": "Được. Kẻ buôn bán cũng mong được nhớ vì chữ tín, không chỉ vì giá hàng."
        }
      ],
      "choices": [
        {
          "id": "ke-cho",
          "label": "Ta sẽ kể chuyện chợ quê mình.",
          "reply": "Tống Hữu Tài bảo sẽ chuẩn bị một ấm trà."
        },
        {
          "id": "khong-hen",
          "label": "Ta chưa thể hẹn ngày trở lại.",
          "reply": "Tống Hữu Tài bảo chữ tín bắt đầu từ việc không hứa quá sức."
        }
      ]
    }
  },
  "NPC013": {
    "stranger": {
      "id": "npc-NPC013-xa-la",
      "title": "Suối Địa Mạch",
      "lines": [
        {
          "who": "npc",
          "text": "Hãy nghe tiếng nước trước khi nói. Ta là Hứa Mặc, tán tu khảo sát Suối Địa Mạch."
        },
        {
          "who": "player",
          "text": "Nước nơi này nghe khác suối thường."
        },
        {
          "who": "npc",
          "text": "Vì dòng dưới đá chạy ngược. Quan sát đủ lâu sẽ thấy nó để lại dấu."
        },
        {
          "who": "player",
          "text": "Ta muốn học bí tịch của ngươi."
        },
        {
          "who": "npc",
          "text": "Học được, nhưng đừng vội gọi điều chưa hiểu là thần thông."
        }
      ]
    },
    "familiar": {
      "id": "npc-NPC013-quen-biet",
      "title": "Nước đổi dòng",
      "lines": [
        {
          "who": "npc",
          "text": "Hôm nay nước ấm hơn hôm trước. Một nhánh địa mạch đang đổi hướng."
        },
        {
          "who": "player",
          "text": "Ngươi ghi chép mọi thay đổi sao?"
        },
        {
          "who": "npc",
          "text": "Đúng. Trí nhớ thường tự sửa điều bất tiện, trang giấy thì không."
        },
        {
          "who": "player",
          "text": "Ta cũng có điều sợ quên."
        },
        {
          "who": "npc",
          "text": "Vậy hãy viết lại. Lời hẹn với mình cũng đáng được giữ."
        }
      ]
    },
    "confidant": {
      "id": "npc-NPC013-tri-ky",
      "title": "Đầu nguồn",
      "lines": [
        {
          "who": "npc",
          "text": "Ngươi tìm nguồn gốc trận văn, ta tìm đầu nguồn địa mạch; đều chẳng dễ."
        },
        {
          "who": "player",
          "text": "Có khi ta chỉ tìm được một phần."
        },
        {
          "who": "npc",
          "text": "Một phần thành thật vẫn hơn kết luận vội vàng."
        },
        {
          "who": "player",
          "text": "Ta sẽ không thất hứa với người đã giúp mình."
        },
        {
          "who": "npc",
          "text": "Tốt. Có những lối về chỉ hiện khi ngươi còn nhớ lý do bắt đầu."
        }
      ],
      "choices": [
        {
          "id": "tim-nguon",
          "label": "Ta sẽ tìm dấu vết đến đầu nguồn.",
          "reply": "Hứa Mặc nhắc hãy quan sát cả những nhánh rẽ."
        },
        {
          "id": "giu-hua",
          "label": "Ta sẽ tìm người đang chờ lời hẹn.",
          "reply": "Hứa Mặc đáp đó cũng là một cách tìm nguồn."
        }
      ]
    }
  },
  "NPC014": {
    "stranger": {
      "id": "npc-NPC014-xa-la",
      "title": "Quét sân Kiếm Cốt Lâm",
      "lines": [
        {
          "who": "npc",
          "text": "Đồ đệ, quét sân trước. Thanh kiếm kia chưa chạy mất đâu."
        },
        {
          "who": "player",
          "text": "Sư phụ, đó cũng là luyện tâm sao?"
        },
        {
          "who": "npc",
          "text": "Không chịu nổi một buổi quét lá, ngươi chịu sao nổi trăm năm tĩnh tu?"
        },
        {
          "who": "player",
          "text": "Đệ tử xin ghi nhớ."
        },
        {
          "who": "npc",
          "text": "Lão phu dạy kiếm, không dạy trò khoe khoang."
        }
      ]
    },
    "familiar": {
      "id": "npc-NPC014-quen-biet",
      "title": "Kiếm giữ lời",
      "lines": [
        {
          "who": "npc",
          "text": "Kiếm ngươi đã bớt tiếng động thừa. Tốt hơn một chiêu hoa mỹ."
        },
        {
          "who": "player",
          "text": "Đệ tử vẫn nhớ cố hương."
        },
        {
          "who": "npc",
          "text": "Nhớ thì mang theo. Chẳng ai buộc ngươi quên quá khứ để học đạo."
        },
        {
          "who": "player",
          "text": "Sư phụ từng có điều muốn trở về chăng?"
        },
        {
          "who": "npc",
          "text": "Có. Nhưng lời hẹn của lão phu phải tự lão phu gánh."
        }
      ]
    },
    "confidant": {
      "id": "npc-NPC014-tri-ky",
      "title": "Lời tiễn biệt",
      "lines": [
        {
          "who": "npc",
          "text": "Đồ đệ, đường trước mặt ngươi ta không thể đi thay."
        },
        {
          "who": "player",
          "text": "Đệ tử còn muốn hỏi rất nhiều điều."
        },
        {
          "who": "npc",
          "text": "Hỏi rồi hãy tự thử. Đừng biến lời thầy thành xiềng xích."
        },
        {
          "who": "player",
          "text": "Đệ tử không quên ân dạy dỗ."
        },
        {
          "who": "npc",
          "text": "Tốt. Khi đến nơi cao nhất, hãy nhớ mình từng đứng ở sân lá này."
        }
      ],
      "choices": [
        {
          "id": "tim-van",
          "label": "Đệ tử sẽ truy tìm nguồn trận văn.",
          "reply": "Lão nhân nhắc rằng biết đáp án chưa phải hiểu hậu quả."
        },
        {
          "id": "giu-dao",
          "label": "Đệ tử sẽ giữ lời với người ở lại.",
          "reply": "Lão nhân gật đầu: Vậy hãy sống cho đúng lời."
        }
      ]
    }
  }
};
  const DUNGEONS = {
  "moc": {
    "intro": "moc",
    "boss": "Tuế Mộc Cổ Lâm phủ bóng lên những phiến đá cũ. Vòng tuổi cây già ghi lại những mùa biến động mà không một sử quan nào còn nhớ."
  },
  "thuy": {
    "intro": "thuy",
    "boss": "Mặc Uyên Hàn Đàm phẳng lặng đến mức phản chiếu những đám mây chưa tới. Bên dưới, thủy tộc vẫn canh giữ mạch linh tuyền cổ."
  },
  "hoa": {
    "intro": "hoa",
    "boss": "Chu Nham Địa Quật rạn nứt bởi nham lưu. Bậc đá đen dẫn xuống như dấu chân những người thợ từng làm việc trong lò khổng lồ."
  },
  "kim": {
    "intro": "kim",
    "boss": "Thiết Phong Kiếm Cốc đón người đến bằng gió sắc như đao. Trên vách dựng, những vết kiếm cổ vẫn chưa bị thời gian bào mòn."
  },
  "tho": {
    "intro": "tho",
    "boss": "Hậu Thổ Trầm Cung ngủ sâu dưới tầng đất hóa đá. Phù văn trên cột vẫn nguyên dù hành lang đã nghiêng lệch từ lâu."
  },
  "ma": {
    "intro": "ma",
    "boss": "Táng Nguyệt Ma Uyên sâu đến mức không nghe tiếng chim bay. Ma khí không thuộc ngũ hành khiến phương hướng cũng khó phân biệt."
  },
  "loi": {
    "intro": "loi",
    "boss": "Lôi Văn Phế Điện còn in những dấu cháy từ nghìn năm. Thiên lôi vẫn tìm tới các hoa văn đứt gãy như muốn hoàn thành điều dang dở."
  },
  "tien": {
    "intro": "tien",
    "boss": "Thái Sơ Tàng Phủ cất giữ những trang bia đá chưa được đọc hết. Sau từng cánh cửa là dấu tích của những người đi trước."
  },
  "kiephai": {
    "intro": "kiephai",
    "boss": "Vạn Kiếp Độ Hải không có bến đò; giữa sóng lôi chỉ những cột đá cũ nhắc đã từng có người thử vượt qua."
  }
};
  const ENCOUNTERS = {
  "suoi": "Bên dòng linh tuyền, một túi linh thạch khô ráo nằm giữa đá ướt. Đạo hữu nhìn quanh trước khi nhặt lấy.",
  "nong": "Lão nông buông cuốc, chỉ cách điều tức giản dị giữa nhịp thở. Lời ông không cao siêu mà thật khó quên.",
  "qua": "Trái cây dại chín dưới bóng lá, mang vị thanh giúp những mỏi mệt trên đường dần lắng xuống.",
  "quynhan": "Vị tiền bối xa lạ để lại chút lộ phí, chẳng hỏi danh tính. Khi ngoảnh lại, người đã khuất sau khúc quanh.",
  "duoc": "Giữa vách đá, linh thảo cúi mình trước gió. Đạo hữu kiên nhẫn nhận ra nơi nó bám rễ.",
  "thien": "Tiếng giảng đạo vọng qua mái hiên. Một lời giản dị khiến điều rối ren trong lòng có chỗ thông suốt.",
  "hat": "Linh điểu vụt qua và đánh rơi một hạt giống. Đạo hữu cất nó đi, nghĩ tới một mùa chưa đến.",
  "lua": "Lời mời đổi chác quá hấp dẫn hóa ra không thật. Chút lộ phí đã mất trở thành bài học về sự vội tin.",
  "chuong": "Chướng khí khép quanh lối núi. Thoát khỏi màn sương ấy, đạo hữu càng hiểu vì sao người trước luôn căn dặn phải nhìn gió.",
  "ditich": "Trên nền di tích cũ, đạo niệm còn sót như câu nói chưa dứt. Đạo hữu ngồi lại để nghe trọn lời nhắn.",
  "mach": "Đường đá khác màu hiện ra sau lớp đất, lộ một mạch linh thạch nhỏ cho người chịu cúi xuống nhìn.",
  "dong": "Động phủ đã vắng chủ lâu ngày, vậy mà hộp linh đan vẫn còn niêm kín trên kệ đá.",
  "caonhan": "Một vị cao nhân dừng chân, chỉ ra chỗ đạo căn chưa thông suốt, rồi lặng lẽ đi xa.",
  "tuyen": "Nước linh tuyền mát lạnh rửa bụi đường. Cơ thể và tâm trí đều nhẹ nhõm sau một chuyến đi dài.",
  "conghuong": "Trong khoảnh khắc ngắn ngủi, đạo căn và nhịp vận hành của thiên địa dường như chung một hơi thở.",
  "thuongnhan": "Vị thương nhân bí ẩn để lại phần linh tài, nói rằng người đi xa cần biết dùng đúng món đồ.",
  "thienthu": "Một trang Thiên Thư cổ xuất hiện giữa hoang phế. Nét chữ không nói hết đạo pháp, nhưng mở một lối suy ngẫm.",
  "tho": "Trái trường thọ chín muồi trên cành cao, nhắc rằng sinh cơ bền bỉ không thể ép đến trong phút chốc.",
  "phacanh": "Giữa khe đá, một viên linh đan nằm yên. Dẫu có ngoại vật tương trợ, bước phá cảnh vẫn phải tự mình đi.",
  "trieu": "Linh khí dâng như thủy triều, khiến thung lũng đổi nhịp. Đạo hữu lặng lẽ điều tức rồi tiếp tục hành trình.",
  "tinhhoa": "Năm dòng khí vận gặp nhau, kết thành tinh hoa hiếm thấy giữa đất trời.",
  "tayan": "Giọt linh dịch ngưng trên thạch nhũ, mang hơi thở của thiên địa được tích lũy qua năm tháng.",
  "tiennhan": "Hư ảnh tiên nhân hiện ra trong khoảnh khắc, để lại đôi lời chỉ điểm. Không biết danh tính, đạo hữu vẫn nhớ bài học."
};
  const TRIBULATION = {
  "ha": "Lôi vân tan khỏi Hạ Giới. Đạo hữu đã bước qua thiên kiếp, song những lời hứa trước sơn môn vẫn theo mình trên đường mới.",
  "linh": "Kiếp lôi ở Linh Giới đã lắng xuống. Những vết nứt của trời đất chưa khép, nhưng đạo tâm có thể đủ kiên định để nhìn thẳng vào chúng.",
  "tien": "Thiên kiếp lắng xuống nơi Tiên Giới. Cảnh giới đổi thay, còn câu hỏi về cố hương và người ở lại vẫn cần chính đạo hữu trả lời."
};
  const data = { ACTS, NPCS, DUNGEONS, ENCOUNTERS, TRIBULATION };
  root.HU_STORY_DATA = data;
  if (typeof module !== 'undefined' && module.exports) module.exports = data;
})(typeof window !== 'undefined' ? window : globalThis);
