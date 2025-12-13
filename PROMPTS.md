# PROMPT 1
preciso de uma ajuda, minha tia tem um restaurante e ela vende marmitas para uma fabrica, porem os pedidos sao feitos por uma folha impressa com o nome dos funcionarios e eles marcam um X nas opcoes que eles querem, e colocam a observacao se querem mudar algo.

eu quero fazer um sistema onde os funcionarios dessa empresa acessam, coloquem seu RA ou CPF e aparece as opcoes para ele escolher.

os funcionarios de cada setor tem um horario especifico para eles pedirem, pois minha tinha precisa de algumas horas para preparar as marmitas.

lembrando que o restaurante dela possui um cardapio diario, ou seja, todo dia o cardapio é diferente, porem existem alguns dias que o cardapio se repete no mes.

ao final do horario para solicitar a marmita eu preciso imprimir em etiquetas colaveis o nome do funcionario e as opcoes que ele escolheu para entao comecar a producao das marmitas.

o sistema deve ser capaz de emitir um relatorio com todas as marmitas produzidas no dia.

a forma de precificacao das marmitas é pelo tamanho delas (grande, media, pequena, pequena com menos e light), eu preciso que ao cadastrar o tipo da marmita eu seja capaz de colocar o preco dela, porem o sistema nao vai ter formas de pagamento, o preço a principio é apenas para eu ter controle e no fim do mes eu repassar para a empresa a quantidade de marmitas e o seu valor.

outras opcoes que os funcionarios podem selecionar sao:

1. Opcional

  1.1 salada

  1.2 sem feijao

2. Trocar prato principal por:

  2.1 ovo frito

  2.2 omelete

  2.3 filé de frango



o sistema eu pensei em algo muito simples, com vuejs + expressjs + mysql.

o que voce me sugere nesse sistema?

eu pensei em ter algumas paginas para a minha tia administrar o sistema, cadastrar marmita, mistura, entre outras coisas, cadastrar o prato do dia, cadastrar o horario maximo para fazer os pedidos (lembrando que a empresa possui turnos de trabalho, entao ela precisa cadastrar horario que libera para fazer o pedido, o horario que fecha o pedido, e deve ter pelo menos uns 3 horarios por dia) após fechar o horario do pedido deve aparecer uma informacao pedindo para o funcionario ligar para o restaurante para solicitar a marmita dele.

o sistema deve ter uma tela para o funcionario "se logar" e solicitar a marmita do dia com as opcoes e deve ter um campo aberto para observações.

acredito que vamos precisar de uma tela de cadastro de funcionario para ele colocar o nome completo, RA/CPF, empresa (dropdown) e setor dele (dropdown).

para o admin ele deve cadastrar as empresas (pensando que esse sistema possa funcionar para mais de uma empresa), os setores da empresa e o horario permitido para este setor.

o admin deve ser capaz de ver os pedidos agrupados por empresa e setor, e deve ser capaz de imprimir etiquetas para colocar em cada marmita.



como a empresa que ela fornece as marmitas é muito grande, e possui muitos setores, eu pensei em algumas solucoes, para esse sistema, uma das solucoes seria colocar um tablet em cada setor, e ai em cada tablet eu ja deixo configurado qual setor que é, e a outra opcao seria apos o funcionario colocar o seu RA/CPF o proximo passo ja carrega as informacoes do funcionario junto com o setor dele. o que voce acha que seja melhor?



voce tem alguma duvida?





Expedicao: listagem com resumo para cozinha e opcao de impressao